import Redis from 'ioredis';
import {
  OpenAIEmbeddingService,
  QdrantVectorStore,
  ParentChildChunker,
  RAGPipelineImpl,
  HybridReranker,
  CohereReranker,
  CachedEmbeddingService,
  type EmbeddingService,
  type CacheService,
  type Reranker,
  type AsyncReranker,
} from '@corpusai/corpus';

let embeddingService: EmbeddingService;
let chunker: ParentChildChunker;
let reranker: Reranker | AsyncReranker;
let redisClient: Redis | null = null;
let initialized = false;

function init(): void {
  if (initialized) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY required');

  const baseEmbeddings = new OpenAIEmbeddingService({
    apiKey,
    model: 'text-embedding-3-small',
  });

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

  chunker = new ParentChildChunker({
    childSizeTokens: 128,
    parentSizeTokens: 512,
    childOverlapTokens: 32,
  });

  const cohereApiKey = process.env.COHERE_API_KEY;
  if (cohereApiKey) {
    reranker = new CohereReranker({ apiKey: cohereApiKey });
    console.log('Cohere cross-encoder reranker enabled (rerank-multilingual-v3.0)');
  } else {
    reranker = new HybridReranker();
    console.log(
      'Hybrid reranker enabled (60% semantic + 40% BM25) — set COHERE_API_KEY for cross-encoder'
    );
  }
  initialized = true;
}

export function createPipelineForAI(aiId: string): RAGPipelineImpl {
  init();

  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const vectorStore = new QdrantVectorStore({
    url: qdrantUrl,
    collectionName: `ai_${aiId}`,
    vectorSize: embeddingService.dimensions,
  });

  return new RAGPipelineImpl(
    embeddingService,
    vectorStore,
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
  initialized = false;
}
