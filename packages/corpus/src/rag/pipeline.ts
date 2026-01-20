import OpenAI from 'openai';
import type { EmbeddingService } from '../embeddings/types';
import type { VectorStoreService } from '../vector-store/types';
import type { ChunkingService, Chunk } from '../chunking/types';
import type {
  RAGPipeline,
  Document,
  IndexResult,
  QueryOptions,
  RAGResponse,
  Source,
  LLMConfig,
} from './types';

const DEFAULT_SYSTEM_PROMPT = `Tu es un assistant expert. Réponds UNIQUEMENT en utilisant le contexte fourni.
Si l'information n'est pas dans le contexte, réponds "Je ne dispose pas de cette information dans les documents fournis."
Cite tes sources à la fin de ta réponse en utilisant le format [Source: nom_du_document].`;

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

  constructor(
    private embeddings: EmbeddingService,
    private vectorStore: VectorStoreService,
    private chunker: ChunkingService,
    private llmConfig: LLMConfig
  ) {
    this.openai = new OpenAI({ apiKey: llmConfig.apiKey });
    this.model = llmConfig.model ?? 'gpt-4o-mini';
    this.temperature = llmConfig.temperature ?? 0.2;
    this.maxTokens = llmConfig.maxTokens ?? 1000;
    this.systemPrompt = llmConfig.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Indexe des documents : chunking → embedding → stockage.
   */
  async index(documents: Document[]): Promise<IndexResult> {
    await this.vectorStore.ensureCollection();

    const allChunks: Chunk[] = [];

    // 1. Chunking de tous les documents
    for (const doc of documents) {
      const chunks = this.chunker.chunk(doc.content, {
        documentId: doc.id,
        source: doc.source,
        ...doc.metadata,
      });
      allChunks.push(...chunks);
    }

    if (allChunks.length === 0) {
      return { documentsIndexed: documents.length, chunksCreated: 0, chunkIds: [] };
    }

    // 2. Embedding de tous les chunks en batch
    const texts = allChunks.map((c) => c.text);
    const embeddings = await this.embeddings.embedBatch(texts);

    // 3. Stockage dans le vector store
    const points = allChunks.map((chunk, i) => {
      const vector = embeddings[i];
      if (!vector) {
        throw new Error(`No embedding for chunk ${chunk.id}`);
      }
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

    await this.vectorStore.upsert(points);

    return {
      documentsIndexed: documents.length,
      chunksCreated: allChunks.length,
      chunkIds: allChunks.map((c) => c.id),
    };
  }

  /**
   * Pose une question et génère une réponse.
   */
  async query(question: string, options: QueryOptions = {}): Promise<RAGResponse> {
    const { topK = 5, scoreThreshold = 0.4, filter, includeSources = true } = options;

    // 1. Embedding de la question
    const questionEmbedding = await this.embeddings.embed(question);

    // 2. Recherche dans le vector store
    const results = await this.vectorStore.search(questionEmbedding, {
      limit: topK,
      scoreThreshold,
      filter,
      withPayload: true,
    });

    // 3. Construction du contexte
    const sources: Source[] = results.map((r) => ({
      chunkId: r.id,
      documentSource: (r.payload.source as string) || 'unknown',
      score: r.score,
      text: (r.payload.text as string) || '',
    }));

    const context = this.buildContext(sources);

    // 4. Génération de la réponse
    if (results.length === 0) {
      return {
        answer: "Je n'ai pas trouvé d'information pertinente dans les documents fournis.",
        sources: [],
        context: '',
      };
    }

    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: `${this.systemPrompt}\n\nCONTEXTE:\n---\n${context}\n---` },
        { role: 'user', content: question },
      ],
    });

    return {
      answer: response.choices[0]?.message.content || '',
      sources: includeSources ? sources : [],
      context,
    };
  }

  /**
   * Pose une question avec streaming de la réponse.
   */
  async *queryStream(
    question: string,
    options: QueryOptions = {}
  ): AsyncGenerator<string, RAGResponse> {
    const { topK = 5, scoreThreshold = 0.4, filter, includeSources = true } = options;

    // 1. Embedding de la question
    const questionEmbedding = await this.embeddings.embed(question);

    // 2. Recherche dans le vector store
    const results = await this.vectorStore.search(questionEmbedding, {
      limit: topK,
      scoreThreshold,
      filter,
      withPayload: true,
    });

    // 3. Construction du contexte
    const sources: Source[] = results.map((r) => ({
      chunkId: r.id,
      documentSource: (r.payload.source as string) || 'unknown',
      score: r.score,
      text: (r.payload.text as string) || '',
    }));

    const context = this.buildContext(sources);

    if (results.length === 0) {
      const noResultMessage = "Je n'ai pas trouvé d'information pertinente dans les documents fournis.";
      yield noResultMessage;
      return {
        answer: noResultMessage,
        sources: [],
        context: '',
      };
    }

    // 4. Génération en streaming
    const stream = await this.openai.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: true,
      messages: [
        { role: 'system', content: `${this.systemPrompt}\n\nCONTEXTE:\n---\n${context}\n---` },
        { role: 'user', content: question },
      ],
    });

    let fullAnswer = '';

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      fullAnswer += token;
      yield token;
    }

    return {
      answer: fullAnswer,
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
  private buildContext(sources: Source[]): string {
    return sources
      .map((s) => `[Source: ${s.documentSource}]\n${s.text}`)
      .join('\n\n---\n\n');
  }
}
