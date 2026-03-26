import Redis from 'ioredis';
import {
  OpenAIEmbeddingService,
  SparseVectorGenerator,
  QdrantVectorStore,
  ParentChildChunker,
  CHUNKER_DEFAULTS,
  RAGPipelineImpl,
  CohereReranker,
  CachedEmbeddingService,
  type EmbeddingService,
  type CacheService,
  type AsyncReranker,
} from '@corpusai/corpus';

let embeddingService: EmbeddingService;
let sparseGenerator: SparseVectorGenerator;
let vectorStore: QdrantVectorStore;
let chunker: ParentChildChunker;
let reranker: AsyncReranker | undefined;
let redisClient: Redis | null = null;
let initialized = false;

function init(): void {
  if (initialized) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required');

  // Embedding service: 512d Matryoshka
  const baseEmbeddings = new OpenAIEmbeddingService({
    apiKey,
    model: 'text-embedding-3-small',
    dimensions: 512,
  });

  // Redis cache (optional)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });

    const cache: CacheService = {
      get: (key: string) => redisClient!.get(key),
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) await redisClient!.setex(key, ttl, value);
        else await redisClient!.set(key, value);
      },
      mget: (keys: string[]) =>
        keys.length === 0 ? Promise.resolve([]) : redisClient!.mget(...keys),
      mset: async (entries: Array<{ key: string; value: string }>, ttl?: number) => {
        if (entries.length === 0) return;
        const pipeline = redisClient!.pipeline();
        for (const { key, value } of entries) {
          if (ttl) pipeline.setex(key, ttl, value);
          else pipeline.set(key, value);
        }
        await pipeline.exec();
      },
    };

    embeddingService = new CachedEmbeddingService({
      baseService: baseEmbeddings,
      cache,
      ttlSeconds: 604800,
      keyPrefix: 'emb:',
    });
  } else {
    embeddingService = baseEmbeddings;
  }

  // Sparse vector generator for BM25 hybrid search
  sparseGenerator = new SparseVectorGenerator();

  // Global vector store (single collection, multi-tenant)
  vectorStore = new QdrantVectorStore({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  });

  // Chunker: centralized defaults
  chunker = new ParentChildChunker(CHUNKER_DEFAULTS);

  // CohereReranker (optional, applied after RRF fusion)
  const cohereApiKey = process.env.COHERE_API_KEY;
  if (cohereApiKey) {
    reranker = new CohereReranker({ apiKey: cohereApiKey });
    console.log('Cohere cross-encoder reranker enabled (post-RRF)');
  } else {
    console.log('No Cohere API key — using Qdrant native RRF hybrid search only');
  }

  initialized = true;
}

export function createPipelineForAI(aiId: string): RAGPipelineImpl {
  init();

  return new RAGPipelineImpl(
    aiId,
    embeddingService,
    vectorStore,
    sparseGenerator,
    chunker,
    {
      apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY!,
      baseURL: process.env.LLM_BASE_URL,
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1000,
    },
    reranker
  );
}

export async function disposeRagFactory(): Promise<void> {
  if (redisClient) {
    redisClient.disconnect();
    redisClient = null;
  }
  if (chunker) {
    chunker.dispose();
  }
  if (sparseGenerator) {
    sparseGenerator.dispose();
  }
  initialized = false;
}
