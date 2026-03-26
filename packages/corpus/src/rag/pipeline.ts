import OpenAI from 'openai';
import { buildSystemPrompt, buildContextSection } from '@corpusai/ai-rules';
import type { EmbeddingService } from '../embeddings/types';
import type { SparseVectorGenerator } from '../embeddings/sparse';
import type { VectorStoreService, SearchResult } from '../vector-store/types';
import type { ChunkingService, Chunk } from '../chunking/types';
import type { AsyncReranker, ScoredResult } from '../reranking/types';
import { CohereReranker } from '../reranking/cohere-reranker';
import type {
  RAGPipeline,
  Document,
  IndexResult,
  IndexedChunk,
  IndexOptions,
  ContextEnrichmentConfig,
  QueryOptions,
  QueryMetrics,
  RAGResponse,
  Source,
  LLMConfig,
  ProgressCallback,
} from './types';

/**
 * Retries a context enrichment call on 429 rate-limit errors, parsing the
 * OpenAI "Please try again in X.Xs" delay from the error message when available.
 * Falls back to `fallback` (original chunk text) after `maxRetries` failures.
 */
async function enrichWithRetry(
  fn: () => Promise<string>,
  chunkIndex: number,
  fallback: string,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const is429 =
        message.includes('429') ||
        message.toLowerCase().includes('rate limit') ||
        message.toLowerCase().includes('too many requests');

      if (!is429 || attempt === maxRetries) {
        console.warn(
          `[Context Enrichment] Failed for chunk ${chunkIndex} (${message}), using original text`
        );
        return fallback;
      }

      // Parse "Please try again in X.Xs" or "in Xms" from the OpenAI error
      const retryMatch = /try again in (\d+(?:\.\d+)?)(m?s)/.exec(message);
      let delay: number;
      if (retryMatch?.[1]) {
        const value = parseFloat(retryMatch[1]);
        delay = retryMatch[2] === 'ms' ? value : value * 1000;
        delay = Math.min(delay + 100, 10_000); // 100ms buffer, cap at 10s
      } else {
        delay = 1000 * Math.pow(2, attempt); // fallback: 1s, 2s, 4s
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return fallback;
}

/**
 * Exécute un tableau de tâches asynchrones avec une concurrence limitée.
 * Préserve l'ordre des résultats.
 */
async function withConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  const queue = tasks.map((task, i) => ({ task, i }));
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      results[item.i] = await item.task();
    }
  });
  await Promise.all(workers);
  return results;
}

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
    private readonly aiId: string,
    private embeddings: EmbeddingService,
    private vectorStore: VectorStoreService,
    private sparseGenerator: SparseVectorGenerator,
    private chunker: ChunkingService,
    private llmConfig: LLMConfig,
    private reranker?: AsyncReranker
  ) {
    this.openai = new OpenAI({
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseURL,
      defaultHeaders: llmConfig.baseURL?.includes('openrouter')
        ? { 'HTTP-Referer': 'https://corpusai.io', 'X-Title': 'CorpusAI' }
        : undefined,
    });
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
    const enableEnrichment = options?.enableContextEnrichment ?? false;
    const enrichmentConfig: ContextEnrichmentConfig = options?.contextEnrichmentConfig ?? {};

    await this.vectorStore.ensureCollection();

    // Clean existing vectors for these documents (idempotent retry)
    for (const doc of documents) {
      await this.vectorStore.deleteByDocument(this.aiId, doc.id);
    }

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
      return { documentsIndexed: documents.length, chunksCreated: 0, chunkIds: [], chunks: [] };
    }

    const totalChunks = allChunks.length;
    const chunkIds: string[] = [];
    const indexedChunks: IndexedChunk[] = [];
    onProgress?.('chunking', 10, `${totalChunks} chunks created`);

    // === PHASE 1.5: ENRICHING (10-30%) — optional ===
    // Génère une phrase de contexte pour chaque chunk via GPT-4o-mini.
    // Le texte enrichi est utilisé uniquement pour l'embedding, le payload Qdrant stocke chunk.text.
    let enrichedTexts: string[] | null = null;
    if (enableEnrichment && documents.length > 0) {
      onProgress?.('enriching', 10, `Enriching ${totalChunks} chunks`);
      const primaryDoc = documents[0]!;
      enrichedTexts = await this.enrichChunks(
        allChunks,
        primaryDoc.content,
        enrichmentConfig,
        onProgress
      );
    }

    // === PHASE 2 & 3: EMBEDDING + STORING by batch (30-100% with enrichment, 10-100% without) ===
    // Process chunks in batches: embed then store immediately to minimize memory usage
    const embeddingStart = enableEnrichment ? 30 : 10;
    const embeddingRange = 100 - embeddingStart;
    const totalBatches = Math.ceil(totalChunks / RAGPipelineImpl.EMBEDDING_BATCH_SIZE);
    onProgress?.('embedding', embeddingStart, `Starting embedding (${totalBatches} batches)`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * RAGPipelineImpl.EMBEDDING_BATCH_SIZE;
      const end = Math.min(start + RAGPipelineImpl.EMBEDDING_BATCH_SIZE, totalChunks);
      const batchChunks = allChunks.slice(start, end);

      // Use enriched text for embedding if available, otherwise original chunk text
      const batchTexts = batchChunks.map((c, i) => enrichedTexts?.[start + i] ?? c.text);

      // Embed dense vectors with retry logic
      const batchEmbeddings = await this.embedWithRetry(batchTexts);

      // Generate sparse vectors for BM25 hybrid search
      const batchSparseVectors = this.sparseGenerator.generateBatch(batchChunks.map((c) => c.text));

      // Prepare hybrid points (dense + sparse + payload with ai_id)
      const isLastBatch = batchIndex === totalBatches - 1;
      const batchPoints = batchChunks.map((chunk, i) => {
        const denseVector = batchEmbeddings[i];
        if (!denseVector) {
          throw new Error(`No embedding for chunk ${chunk.id}`);
        }
        chunkIds.push(chunk.id);
        indexedChunks.push({
          id: chunk.id,
          text: chunk.text,
          position: chunk.metadata.chunkIndex as number,
          pageNumber: chunk.metadata.pageNumber as number | undefined,
        });
        return {
          id: chunk.id,
          denseVector,
          sparseVector: batchSparseVectors[i]!,
          payload: {
            ai_id: this.aiId,
            text: chunk.text,
            source: chunk.metadata.source as string,
            documentId: chunk.metadata.documentId as string,
            chunkIndex: chunk.metadata.chunkIndex as number,
            ...(chunk.metadata.parentContent && {
              parent_content: chunk.metadata.parentContent as string,
            }),
          },
        };
      });

      // Store this batch immediately (wait only on last batch for throughput)
      await this.vectorStore.upsert(batchPoints, isLastBatch);

      // Progress: embeddingStart-100% for combined embedding + storing
      const progress =
        embeddingStart + Math.round(((batchIndex + 1) / totalBatches) * embeddingRange);
      const stage = progress < embeddingStart + embeddingRange * 0.7 ? 'embedding' : 'storing';
      onProgress?.(stage, progress, `Batch ${batchIndex + 1}/${totalBatches}`);
    }

    onProgress?.('storing', 100, 'Indexing complete');

    return {
      documentsIndexed: documents.length,
      chunksCreated: totalChunks,
      chunkIds,
      chunks: indexedChunks,
    };
  }

  /**
   * Pose une question et génère une réponse.
   * Inclut des métriques de latence pour le monitoring.
   */
  async query(question: string, options: QueryOptions = {}): Promise<RAGResponse> {
    const {
      topK: topKOption,
      topN = 3,
      scoreThreshold = 0.6,
      filter,
      includeSources = true,
      rerankerConfig,
      conversationHistory = [],
      maxContextChars,
      useHyde: useHydeOption,
    } = options;
    const topK = topKOption ?? (this.reranker instanceof CohereReranker ? 10 : 5);
    const totalStart = Date.now();
    const metrics: QueryMetrics = {
      embeddingMs: 0,
      searchMs: 0,
      rerankMs: 0,
      llmMs: 0,
      totalMs: 0,
    };

    this.log('\n========== RAG QUERY ==========');
    this.log(`[RAG] Question: "${question}"`);
    this.log(
      `[RAG] Options: topK=${topK}, scoreThreshold=${scoreThreshold}, historyLength=${conversationHistory.length}`
    );

    // 1. Embedding de la question + recherche (HyDE si applicable)
    const embedStart = Date.now();
    const useHyde = this.shouldUseHyde(question, useHydeOption);
    let results: SearchResult[];

    if (useHyde) {
      this.log('[RAG] HyDE enabled — generating hypothetical document');
      const { results: hydeResults, hydeMs } = await this.hydeSearch(question, {
        limit: topK,
        scoreThreshold,
      });
      results = hydeResults;
      metrics.hydeMs = hydeMs;
      metrics.embeddingMs = hydeMs;
      metrics.searchMs = 0;
      this.log(`[RAG] HyDE search: ${results.length} results in ${hydeMs}ms`);
    } else {
      const [questionEmbedding, questionSparse] = await Promise.all([
        this.embeddings.embed(question),
        Promise.resolve(this.sparseGenerator.generate(question)),
      ]);
      metrics.embeddingMs = Date.now() - embedStart;
      this.log(`[RAG] Embedding: ${metrics.embeddingMs}ms`);
      const searchStart = Date.now();
      results = await this.vectorStore.hybridSearch(questionEmbedding, questionSparse, this.aiId, {
        limit: topK,
        scoreThreshold,
        withPayload: true,
      });
      metrics.searchMs = Date.now() - searchStart;
      this.log(`[RAG] Hybrid search: ${results.length} results in ${metrics.searchMs}ms`);
    }

    // Log each result with score
    results.forEach((r, i) => {
      this.log(
        `[RAG]   #${i + 1} score=${r.score.toFixed(4)} source="${r.payload.source ?? 'unknown'}" text="${((r.payload.text as string) || '').slice(0, 80)}..."`
      );
    });

    // 3. Appliquer le reranking si configuré (skip si résultats trop peu nombreux ou déjà très pertinents)
    const rerankStart = Date.now();
    const avgSearchScore =
      results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
    const shouldRerank = results.length >= 3 && avgSearchScore < 0.8;
    const allRankedResults = shouldRerank
      ? await this.applyRerankingAsync(results, question, rerankerConfig)
      : results;
    // Tronquer au topN après reranking (pertinent pour CohereReranker qui réduit 10 → 3)
    const rankedResults = allRankedResults.slice(0, topN);
    metrics.rerankMs = Date.now() - rerankStart;
    if (this.reranker) {
      this.log(`[RAG] Reranking: ${metrics.rerankMs}ms`);
      rankedResults.forEach((r, i) => {
        this.log(
          `[RAG]   Reranked #${i + 1} finalScore=${('finalScore' in r ? (r as { finalScore: number }).finalScore : r.score).toFixed(4)} semantic=${('semanticScore' in r ? (r as { semanticScore: number }).semanticScore : r.score).toFixed(4)}`
        );
      });
    }

    // 4. Construction du contexte
    const sources: Source[] = rankedResults.map((r) => ({
      chunkId: r.id,
      documentSource: (r.payload.source as string) || 'unknown',
      score: this.getScore(r),
      // Use parent_content for LLM context if available (richer ~512 tokens),
      // fallback to text for backwards-compatibility with old indexed documents.
      text: (r.payload.parent_content as string) || (r.payload.text as string) || '',
    }));

    const context = this.buildContext(sources, maxContextChars);

    // 5. Génération de la réponse
    if (rankedResults.length === 0) {
      this.log('[RAG] No results found - calling LLM without context');
    }

    const avgScore =
      sources.length > 0 ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length : 0;
    this.log(`[RAG] Average score: ${avgScore.toFixed(4)}`);

    this.log('[RAG] Calling LLM...');
    const llmStart = Date.now();

    const systemContent = `${this.systemPrompt}\n\nCONTEXTE:\n---\n${context || 'Aucun contexte disponible.'}\n---`;

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
    metrics.promptTokens = response.usage?.prompt_tokens;
    metrics.completionTokens = response.usage?.completion_tokens;
    metrics.totalTokens = response.usage?.total_tokens;

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
    const {
      topK: topKOption,
      topN = 3,
      scoreThreshold = 0.6,
      filter,
      includeSources = true,
      rerankerConfig,
      conversationHistory = [],
      maxContextChars,
      useHyde: useHydeOption,
    } = options;
    const topK = topKOption ?? (this.reranker instanceof CohereReranker ? 10 : 5);

    const totalStart = Date.now();
    const metrics: QueryMetrics = {
      embeddingMs: 0,
      searchMs: 0,
      rerankMs: 0,
      llmMs: 0,
      totalMs: 0,
    };

    this.log('\n========== RAG QUERY STREAM ==========');
    this.log(`[RAG-STREAM] Question: "${question}"`);
    this.log(
      `[RAG-STREAM] Options: topK=${topK}, scoreThreshold=${scoreThreshold}, historyLength=${conversationHistory.length}`
    );

    // 1. Embedding de la question + recherche (HyDE si applicable)
    const useHyde = this.shouldUseHyde(question, useHydeOption);
    let results: SearchResult[];

    const searchStart = Date.now();
    if (useHyde) {
      this.log('[RAG-STREAM] HyDE enabled — generating hypothetical document');
      const { results: hydeResults, hydeMs } = await this.hydeSearch(question, {
        limit: topK,
        scoreThreshold,
      });
      results = hydeResults;
      this.log(`[RAG-STREAM] HyDE search: ${results.length} results in ${hydeMs}ms`);
    } else {
      const embStart = Date.now();
      const [questionEmbedding, questionSparse] = await Promise.all([
        this.embeddings.embed(question),
        Promise.resolve(this.sparseGenerator.generate(question)),
      ]);
      metrics.embeddingMs = Date.now() - embStart;
      results = await this.vectorStore.hybridSearch(questionEmbedding, questionSparse, this.aiId, {
        limit: topK,
        scoreThreshold,
        withPayload: true,
      });
    }
    metrics.searchMs = Date.now() - searchStart;

    this.log(`[RAG-STREAM] Search: ${results.length} results`);
    results.forEach((r, i) => {
      this.log(
        `[RAG-STREAM]   #${i + 1} score=${r.score.toFixed(4)} source="${r.payload.source}" text="${(r.payload.text as string).slice(0, 80)}..."`
      );
    });

    // 3. Appliquer le reranking si configuré (skip si résultats trop peu nombreux ou déjà très pertinents)
    const rerankStart = Date.now();
    const avgScoreStream =
      results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
    const shouldRerankStream = results.length >= 3 && avgScoreStream < 0.8;
    const allRankedResults = shouldRerankStream
      ? await this.applyRerankingAsync(results, question, rerankerConfig)
      : results;
    metrics.rerankMs = Date.now() - rerankStart;
    const rankedResults = allRankedResults.slice(0, topN);

    // 4. Construction du contexte
    const sources: Source[] = rankedResults.map((r) => ({
      chunkId: r.id,
      documentSource: (r.payload.source as string) || 'unknown',
      score: this.getScore(r),
      // Use parent_content for LLM context if available (richer ~512 tokens),
      // fallback to text for backwards-compatibility with old indexed documents.
      text: (r.payload.parent_content as string) || (r.payload.text as string) || '',
    }));

    const context = this.buildContext(sources, maxContextChars);

    const avgScore =
      sources.length > 0 ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length : 0;
    this.log(`[RAG-STREAM] Average score: ${avgScore.toFixed(4)}`);

    // 5. Génération en streaming
    const systemContent = `${this.systemPrompt}\n\nCONTEXTE:\n---\n${context || 'Aucun contexte disponible.'}\n---`;

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
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: systemContent },
        ...historyMessages,
        { role: 'user', content: question },
      ],
    });

    this.log('[RAG-STREAM] Calling LLM with streaming...');

    // Use array buffer instead of string concatenation for O(n) performance
    const tokens: string[] = [];
    let streamUsage:
      | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      | undefined;
    const llmStart = Date.now();

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        tokens.push(token);
        yield token;
      }
      // Usage is included in the last chunk when stream_options.include_usage is true
      if (chunk.usage) {
        streamUsage = chunk.usage;
      }
    }

    metrics.llmMs = Date.now() - llmStart;
    metrics.totalMs = Date.now() - totalStart;
    metrics.promptTokens = streamUsage?.prompt_tokens;
    metrics.completionTokens = streamUsage?.completion_tokens;
    metrics.totalTokens = streamUsage?.total_tokens;

    const answer = tokens.join('');
    this.log(`[RAG-STREAM] LLM response complete: ${answer.length} chars, ${metrics.llmMs}ms`);
    this.log(`[RAG-STREAM] Total time: ${metrics.totalMs}ms`);
    this.log('========== END RAG QUERY STREAM ==========\n');

    return {
      answer,
      sources: includeSources ? sources : [],
      context,
      metrics,
    };
  }

  /**
   * Supprime des documents de l'index.
   */
  async deleteDocuments(documentIds: string[]): Promise<void> {
    for (const docId of documentIds) {
      await this.vectorStore.deleteByDocument(this.aiId, docId);
    }
  }

  /**
   * Construit le contexte à partir des sources.
   */
  private buildContext(sources: Source[], maxChars?: number): string {
    return buildContextSection(sources, maxChars);
  }

  /**
   * Applique le reranking (sync ou async) si un reranker est configuré.
   * Utilise instanceof CohereReranker pour discriminer async vs sync.
   */
  private async applyRerankingAsync(
    results: SearchResult[],
    query: string,
    config?: import('../reranking/types').RerankerConfig
  ): Promise<(SearchResult | ScoredResult)[]> {
    if (!this.reranker || results.length === 0) {
      return results;
    }
    return await this.reranker.rerank(results, query, config);
  }

  /**
   * Détermine si HyDE doit être utilisé pour cette question.
   * - `useHyde` explicite → respecte l'override
   * - Question avec mot-clé spécifique → pas de HyDE (question ciblée)
   * - Question courte (< 8 mots) → HyDE actif (question vague)
   * - Sinon (longue sans keyword) → HyDE actif
   */
  private shouldUseHyde(question: string, useHyde?: boolean): boolean {
    if (useHyde !== undefined) return useHyde;
    const specificKeywords =
      /\b(comment|pourquoi|quelle?s?|combien|quand|où|définition|signifie|explique|liste|résume|compare)\b/i;
    // Question ciblée (avec keyword) = pas de HyDE, quelle que soit la longueur
    if (specificKeywords.test(question)) return false;
    const words = question.trim().split(/\s+/);
    // Question courte et vague = HyDE
    return words.length < 8;
  }

  /**
   * Génère une réponse hypothétique à la question via le LLM.
   * Fallback sur la question brute si la réponse est vide ou en cas d'erreur.
   */
  private async generateHypotheticalDoc(question: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Réponds brièvement à cette question comme si tu étais un expert : ${question}`,
        },
      ],
    });
    return response.choices[0]?.message.content || question;
  }

  /**
   * Recherche HyDE : génère un document hypothétique, embed question + doc hypothétique
   * en parallèle, fait deux recherches Qdrant, merge et déduplique par id (meilleur score).
   * Fallback sur recherche standard si la génération échoue.
   */
  private async hydeSearch(
    question: string,
    options: { limit: number; scoreThreshold: number }
  ): Promise<{ results: SearchResult[]; hydeMs: number }> {
    const hydeStart = Date.now();
    try {
      const hypotheticalDoc = await this.generateHypotheticalDoc(question);
      this.log(`[RAG] HyDE hypothetical doc: "${hypotheticalDoc.slice(0, 100)}..."`);

      // Embed dense + sparse in parallel for both question and hypothetical doc
      const [questionVec, hypoVec] = await Promise.all([
        this.embeddings.embed(question),
        this.embeddings.embed(hypotheticalDoc),
      ]);
      const questionSparse = this.sparseGenerator.generate(question);
      const hypoSparse = this.sparseGenerator.generate(hypotheticalDoc);

      // Hybrid search in parallel
      const searchOptions = { ...options, withPayload: true };
      const [resultsQ, resultsHypo] = await Promise.all([
        this.vectorStore.hybridSearch(questionVec, questionSparse, this.aiId, searchOptions),
        this.vectorStore.hybridSearch(hypoVec, hypoSparse, this.aiId, searchOptions),
      ]);

      // Merge + dedup: keep best score per id
      const merged = new Map<string, SearchResult>();
      for (const r of [...resultsQ, ...resultsHypo]) {
        const existing = merged.get(r.id);
        if (!existing || r.score > existing.score) {
          merged.set(r.id, r);
        }
      }

      const results = [...merged.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit);

      return { results, hydeMs: Date.now() - hydeStart };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn('[RAG] HyDE failed, falling back to standard search:', msg);
      const questionVec = await this.embeddings.embed(question);
      const questionSparse = this.sparseGenerator.generate(question);
      const results = await this.vectorStore.hybridSearch(questionVec, questionSparse, this.aiId, {
        ...options,
        withPayload: true,
      });
      return { results, hydeMs: Date.now() - hydeStart };
    }
  }

  /**
   * Extrait le score d'un résultat (supporte SearchResult et ScoredResult).
   */
  private getScore(result: SearchResult | ScoredResult): number {
    // ScoredResult a un finalScore, SearchResult a juste score
    return 'finalScore' in result ? result.finalScore : result.score;
  }

  /**
   * Enrichit les chunks avec une phrase de contexte générée par GPT-4o-mini.
   * Le texte enrichi est utilisé uniquement pour l'embedding, pas stocké dans le payload.
   *
   * @param chunks - Chunks à enrichir
   * @param documentContent - Contenu brut du document (pour le contexte)
   * @param config - Configuration de l'enrichissement
   * @returns Tableau de textes enrichis (même ordre que chunks), fallback sur chunk.text si erreur
   */
  private async enrichChunks(
    chunks: Chunk[],
    documentContent: string,
    config: ContextEnrichmentConfig,
    onProgress?: ProgressCallback
  ): Promise<string[]> {
    const model = config.model ?? 'gpt-4o-mini';
    const concurrency = config.concurrency ?? 3;
    const maxDocumentChars = (config.maxDocumentTokens ?? 6000) * 4;

    // Truncate document to maxDocumentChars, cutting on last \n if possible
    let documentTruncated = documentContent.slice(0, maxDocumentChars);
    if (documentContent.length > maxDocumentChars) {
      const lastNewline = documentTruncated.lastIndexOf('\n');
      if (lastNewline > maxDocumentChars * 0.5) {
        documentTruncated = documentTruncated.slice(0, lastNewline);
      }
    }

    // Create a separate OpenAI client for enrichment (may differ from LLM config)
    const enrichmentClient = new OpenAI({
      apiKey: config.apiKey ?? this.llmConfig.apiKey,
      baseURL: config.baseURL ?? this.llmConfig.baseURL,
    });

    // Estimate cost before starting and abort if it exceeds the configured limit
    const estimatedInputTokens = chunks.reduce(
      (sum, c) => sum + Math.ceil((documentTruncated.length + c.text.length) / 4),
      0
    );
    const estimatedOutputTokens = chunks.length * 15;
    const estimatedCost =
      (estimatedInputTokens / 1_000_000) * 0.15 + (estimatedOutputTokens / 1_000_000) * 0.6;
    const maxCostUsd = config.maxCostUsd ?? 0.1;

    if (estimatedCost > maxCostUsd) {
      console.warn(
        `[Context Enrichment] Estimated cost $${estimatedCost.toFixed(4)} exceeds limit $${maxCostUsd.toFixed(2)} — skipping enrichment for ${chunks.length} chunks`
      );
      return chunks.map((c) => c.text);
    }

    console.log(
      `[Context Enrichment] ${chunks.length} chunks, ~${Math.ceil(estimatedInputTokens / 1000)}K input tokens, ~${estimatedOutputTokens} output tokens, estimated cost: $${estimatedCost.toFixed(4)} (model: ${model})`
    );

    const tasks = chunks.map((chunk, i) => async (): Promise<string> => {
      return enrichWithRetry(
        async () => {
          const prompt = `Document : ${documentTruncated}\n\nExtrait : ${chunk.text}\n\nEn une phrase, décris où cet extrait se situe dans le document et son sujet. Réponds directement.`;

          const response = await enrichmentClient.chat.completions.create({
            model,
            temperature: 0,
            max_tokens: 60,
            messages: [{ role: 'user', content: prompt }],
          });

          const contextPhrase = response.choices[0]?.message?.content?.trim();
          if (!contextPhrase) {
            console.warn(`[Context Enrichment] Empty response for chunk ${i}, using original text`);
            return chunk.text;
          }

          return `${contextPhrase}\n${chunk.text}`;
        },
        i,
        chunk.text
      );
    });

    const results = await withConcurrency(tasks, concurrency);

    onProgress?.('enriching', 30, `${chunks.length} chunks enriched`);

    return results;
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
