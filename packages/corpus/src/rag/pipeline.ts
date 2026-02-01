import OpenAI from 'openai';
import { buildSystemPrompt, buildContextSection } from '@corpusai/ai-rules';
import type { EmbeddingService } from '../embeddings/types';
import type { VectorStoreService, SearchResult } from '../vector-store/types';
import type { ChunkingService, Chunk } from '../chunking/types';
import type { Reranker, ScoredResult } from '../reranking/types';
import type {
  RAGPipeline,
  Document,
  IndexResult,
  IndexOptions,
  QueryOptions,
  QueryMetrics,
  RAGResponse,
  Source,
  LLMConfig,
  ProgressCallback,
} from './types';

/**
 * Pipeline RAG complet.
 * Combine embeddings, vector store et chunking pour créer un assistant RAG.
 *
 * @example
 * ```typescript
 * const pipeline = new RAGPipelineImpl(
 *   new OpenAIEmbeddingService({ apiKey: '...' }),
 *   new QdrantVectorStore({ url: '...', collectionName: 'docs', vectorSize: 1536 }),
 *   new RecursiveChunker({ chunkSize: 500 }),
 *   { apiKey: '...', model: 'gpt-4o-mini', temperature: 0.2 }
 * );
 *
 * // Indexer des documents
 * await pipeline.index([{ id: '1', content: '...', source: 'doc.md' }]);
 *
 * // Poser une question
 * const response = await pipeline.query('Qu\'est-ce que TypeScript ?');
 * console.log(response.answer);
 * ```
 */
export class RAGPipelineImpl implements RAGPipeline {
  private openai: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private systemPrompt: string;
  private debug: boolean;

  constructor(
    private embeddings: EmbeddingService,
    private vectorStore: VectorStoreService,
    private chunker: ChunkingService,
    private llmConfig: LLMConfig,
    private reranker?: Reranker
  ) {
    this.openai = new OpenAI({ apiKey: llmConfig.apiKey });
    this.model = llmConfig.model ?? 'gpt-4o-mini';
    this.temperature = llmConfig.temperature ?? 0.2;
    this.maxTokens = llmConfig.maxTokens ?? 1000;
    this.systemPrompt = buildSystemPrompt({
      customPrompt: llmConfig.systemPrompt,
    });
    this.debug = llmConfig.debug ?? false;
  }

  private log(message: string): void {
    if (this.debug) console.log(message);
  }

  /** Taille des batches pour l'embedding (max OpenAI: 2048, optimal: 100) */
  private static readonly EMBEDDING_BATCH_SIZE = 100;
  /** Number of retries for API calls */
  private static readonly MAX_RETRIES = 3;
  /** Base delay for exponential backoff (ms) */
  private static readonly RETRY_BASE_DELAY = 1000;

  /**
   * Indexe des documents : chunking → embedding → stockage.
   * Supporte un callback de progression pour le suivi en temps réel.
   *
   * Optimisé pour la mémoire : traite par batches sans accumuler tous les embeddings.
   * Embed et store chaque batch immédiatement plutôt que d'accumuler en mémoire.
   *
   * Répartition de la progression :
   * - Chunking: 0-10%
   * - Embedding + Storing: 10-100% (traités ensemble par batch)
   */
  async index(documents: Document[], options?: IndexOptions): Promise<IndexResult> {
    const onProgress = options?.onProgress;

    await this.vectorStore.ensureCollection();

    // === PHASE 1: CHUNKING (0-10%) ===
    onProgress?.('chunking', 0, 'Starting chunking');

    // Chunk all documents (necessary to know total count for progress)
    const allChunks: Chunk[] = [];
    const totalDocs = documents.length;

    for (let i = 0; i < totalDocs; i++) {
      const doc = documents[i]!;
      const chunks = this.chunker.chunk(doc.content, {
        documentId: doc.id,
        source: doc.source,
        ...doc.metadata,
      });
      allChunks.push(...chunks);

      // Progress: 0-10% pour le chunking
      const chunkProgress = Math.round(((i + 1) / totalDocs) * 10);
      onProgress?.('chunking', chunkProgress, `Document ${i + 1}/${totalDocs}`);
    }

    if (allChunks.length === 0) {
      onProgress?.('storing', 100, 'No chunks to index');
      return { documentsIndexed: documents.length, chunksCreated: 0, chunkIds: [] };
    }

    const totalChunks = allChunks.length;
    const chunkIds: string[] = [];
    onProgress?.('chunking', 10, `${totalChunks} chunks created`);

    // === PHASE 2 & 3: EMBEDDING + STORING by batch (10-100%) ===
    // Process chunks in batches: embed then store immediately to minimize memory usage
    const totalBatches = Math.ceil(totalChunks / RAGPipelineImpl.EMBEDDING_BATCH_SIZE);
    onProgress?.('embedding', 10, `Starting embedding (${totalBatches} batches)`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * RAGPipelineImpl.EMBEDDING_BATCH_SIZE;
      const end = Math.min(start + RAGPipelineImpl.EMBEDDING_BATCH_SIZE, totalChunks);
      const batchChunks = allChunks.slice(start, end);
      const batchTexts = batchChunks.map((c) => c.text);

      // Embed this batch with retry logic
      const batchEmbeddings = await this.embedWithRetry(batchTexts);

      // Prepare and store points for this batch immediately
      const batchPoints = batchChunks.map((chunk, i) => {
        const vector = batchEmbeddings[i];
        if (!vector) {
          throw new Error(`No embedding for chunk ${chunk.id}`);
        }
        chunkIds.push(chunk.id);
        return {
          id: chunk.id,
          vector,
          payload: {
            text: chunk.text,
            source: chunk.metadata.source,
            documentId: chunk.metadata.documentId,
            chunkIndex: chunk.metadata.chunkIndex,
          },
        };
      });

      // Store this batch immediately (don't accumulate embeddings in memory)
      await this.vectorStore.upsert(batchPoints);

      // Progress: 10-100% for combined embedding + storing
      const progress = 10 + Math.round(((batchIndex + 1) / totalBatches) * 90);
      const stage = progress < 80 ? 'embedding' : 'storing';
      onProgress?.(stage, progress, `Batch ${batchIndex + 1}/${totalBatches}`);
    }

    onProgress?.('storing', 100, 'Indexing complete');

    return {
      documentsIndexed: documents.length,
      chunksCreated: totalChunks,
      chunkIds,
    };
  }

  /**
   * Pose une question et génère une réponse.
   * Inclut des métriques de latence pour le monitoring.
   */
  async query(question: string, options: QueryOptions = {}): Promise<RAGResponse> {
    const { topK = 5, scoreThreshold = 0.6, filter, includeSources = true, rerankerConfig, conversationHistory = [], maxContextChars } = options;
    const totalStart = Date.now();
    const metrics: QueryMetrics = { embeddingMs: 0, searchMs: 0, rerankMs: 0, llmMs: 0, totalMs: 0 };

    this.log('\n========== RAG QUERY ==========');
    this.log(`[RAG] Question: "${question}"`);
    this.log(`[RAG] Options: topK=${topK}, scoreThreshold=${scoreThreshold}, historyLength=${conversationHistory.length}`);

    // 1. Embedding de la question
    const embedStart = Date.now();
    const questionEmbedding = await this.embeddings.embed(question);
    metrics.embeddingMs = Date.now() - embedStart;
    this.log(`[RAG] Embedding: ${metrics.embeddingMs}ms`);

    // 2. Recherche dans le vector store
    const searchStart = Date.now();
    const results = await this.vectorStore.search(questionEmbedding, {
      limit: topK,
      scoreThreshold,
      filter,
      withPayload: true,
    });
    metrics.searchMs = Date.now() - searchStart;
    this.log(`[RAG] Search: ${results.length} results in ${metrics.searchMs}ms`);

    // Log each result with score
    results.forEach((r, i) => {
      this.log(`[RAG]   #${i + 1} score=${r.score.toFixed(4)} source="${r.payload.source ?? 'unknown'}" text="${((r.payload.text as string) || '').slice(0, 80)}..."`);
    });

    // 3. Appliquer le reranking si configuré
    const rerankStart = Date.now();
    const rankedResults = this.applyReranking(results, question, rerankerConfig);
    metrics.rerankMs = Date.now() - rerankStart;
    if (this.reranker) {
      this.log(`[RAG] Reranking: ${metrics.rerankMs}ms`);
    }

    // 4. Construction du contexte
    const sources: Source[] = rankedResults.map((r) => ({
      chunkId: r.id,
      documentSource: (r.payload.source as string) || 'unknown',
      score: this.getScore(r),
      text: (r.payload.text as string) || '',
    }));

    const context = this.buildContext(sources, maxContextChars);

    // 5. Génération de la réponse
    if (rankedResults.length === 0) {
      this.log('[RAG] No results found - calling LLM without context');
    }

    const avgScore = sources.length > 0
      ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length
      : 0;
    this.log(`[RAG] Average score: ${avgScore.toFixed(4)}`);

    const lowRelevance = rankedResults.length === 0 || avgScore < 0.5;
    if (lowRelevance) {
      this.log('[RAG] Low relevance - LLM will be warned');
    }

    this.log('[RAG] Calling LLM...');
    const llmStart = Date.now();

    const systemContent = lowRelevance
      ? `${this.systemPrompt}\n\nNote : le contexte ci-dessous a une pertinence faible par rapport à la question. Réponds quand même du mieux possible avec ce que tu as, et précise si l'information est partielle.\n\nCONTEXTE:\n---\n${context || 'Aucun contexte disponible.'}\n---`
      : `${this.systemPrompt}\n\nCONTEXTE:\n---\n${context}\n---`;

    // Build messages with conversation history (last 6 messages max)
    const historyMessages = conversationHistory.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: systemContent },
        ...historyMessages,
        { role: 'user', content: question },
      ],
    });
    metrics.llmMs = Date.now() - llmStart;
    metrics.totalMs = Date.now() - totalStart;

    const answer = response.choices[0]?.message.content || '';
    this.log(`[RAG] LLM response: ${metrics.llmMs}ms, ${answer.length} chars`);
    this.log(`[RAG] Total time: ${metrics.totalMs}ms`);
    this.log('========== END RAG QUERY ==========\n');

    return {
      answer,
      sources: includeSources ? sources : [],
      context,
      metrics,
    };
  }

  /**
   * Pose une question avec streaming de la réponse.
   */
  async *queryStream(
    question: string,
    options: QueryOptions = {}
  ): AsyncGenerator<string, RAGResponse> {
    const { topK = 5, scoreThreshold = 0.6, filter, includeSources = true, rerankerConfig, conversationHistory = [], maxContextChars } = options;

    this.log('\n========== RAG QUERY STREAM ==========');
    this.log(`[RAG-STREAM] Question: "${question}"`);
    this.log(`[RAG-STREAM] Options: topK=${topK}, scoreThreshold=${scoreThreshold}, historyLength=${conversationHistory.length}`);

    // 1. Embedding de la question
    const questionEmbedding = await this.embeddings.embed(question);

    // 2. Recherche dans le vector store
    const results = await this.vectorStore.search(questionEmbedding, {
      limit: topK,
      scoreThreshold,
      filter,
      withPayload: true,
    });

    this.log(`[RAG-STREAM] Search: ${results.length} results`);
    results.forEach((r, i) => {
      this.log(`[RAG-STREAM]   #${i + 1} score=${r.score.toFixed(4)} source="${r.payload.source}" text="${(r.payload.text as string).slice(0, 80)}..."`);
    });

    // 3. Appliquer le reranking si configuré
    const rankedResults = this.applyReranking(results, question, rerankerConfig);

    // 4. Construction du contexte
    const sources: Source[] = rankedResults.map((r) => ({
      chunkId: r.id,
      documentSource: (r.payload.source as string) || 'unknown',
      score: this.getScore(r),
      text: (r.payload.text as string) || '',
    }));

    const context = this.buildContext(sources, maxContextChars);

    const avgScore = sources.length > 0
      ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length
      : 0;
    this.log(`[RAG-STREAM] Average score: ${avgScore.toFixed(4)}`);

    const lowRelevance = rankedResults.length === 0 || avgScore < 0.5;
    if (lowRelevance) {
      this.log('[RAG-STREAM] Low relevance - LLM will be warned');
    }

    // 5. Génération en streaming
    const systemContent = lowRelevance
      ? `${this.systemPrompt}\n\nNote : le contexte ci-dessous a une pertinence faible par rapport à la question. Réponds quand même du mieux possible avec ce que tu as, et précise si l'information est partielle.\n\nCONTEXTE:\n---\n${context || 'Aucun contexte disponible.'}\n---`
      : `${this.systemPrompt}\n\nCONTEXTE:\n---\n${context}\n---`;

    // Build messages with conversation history (last 6 messages max)
    const historyMessages = conversationHistory.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const stream = await this.openai.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: systemContent },
        ...historyMessages,
        { role: 'user', content: question },
      ],
    });

    this.log('[RAG-STREAM] Calling LLM with streaming...');

    // Use array buffer instead of string concatenation for O(n) performance
    const tokens: string[] = [];

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      tokens.push(token);
      yield token;
    }

    const answer = tokens.join('');
    this.log(`[RAG-STREAM] LLM response complete: ${answer.length} chars`);
    this.log('========== END RAG QUERY STREAM ==========\n');

    return {
      answer,
      sources: includeSources ? sources : [],
      context,
    };
  }

  /**
   * Supprime des documents de l'index.
   */
  async deleteDocuments(documentIds: string[]): Promise<void> {
    for (const docId of documentIds) {
      await this.vectorStore.delete({
        must: [{ key: 'documentId', match: { value: docId } }],
      });
    }
  }

  /**
   * Construit le contexte à partir des sources.
   */
  private buildContext(sources: Source[], maxChars?: number): string {
    return buildContextSection(sources, maxChars);
  }

  /**
   * Applique le reranking si un reranker est configuré.
   */
  private applyReranking(
    results: SearchResult[],
    query: string,
    config?: import('../reranking/types').RerankerConfig
  ): (SearchResult | ScoredResult)[] {
    if (!this.reranker || results.length === 0) {
      return results;
    }
    return this.reranker.rerank(results, query, config);
  }

  /**
   * Extrait le score d'un résultat (supporte SearchResult et ScoredResult).
   */
  private getScore(result: SearchResult | ScoredResult): number {
    // ScoredResult a un finalScore, SearchResult a juste score
    return 'finalScore' in result ? result.finalScore : result.score;
  }

  /**
   * Embed texts with retry logic and exponential backoff.
   * Handles transient API errors (rate limits, network issues).
   */
  private async embedWithRetry(texts: string[]): Promise<number[][]> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < RAGPipelineImpl.MAX_RETRIES; attempt++) {
      try {
        return await this.embeddings.embedBatch(texts);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-retryable errors (e.g., invalid input)
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Last attempt - throw the error
        if (attempt === RAGPipelineImpl.MAX_RETRIES - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s...
        const delay = RAGPipelineImpl.RETRY_BASE_DELAY * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }

    throw lastError ?? new Error('Embedding failed after retries');
  }

  /**
   * Check if an error should not be retried.
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    // Don't retry on validation errors or auth errors
    return (
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('api key')
    );
  }

  /**
   * Delay helper for retry backoff.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
