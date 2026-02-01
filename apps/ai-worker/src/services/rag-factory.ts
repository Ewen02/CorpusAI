import Redis from "ioredis";
import {
  OpenAIEmbeddingService,
  QdrantVectorStore,
  TokenChunker,
  RAGPipelineImpl,
  HybridReranker,
  CachedEmbeddingService,
  type EmbeddingService,
  type CacheService,
  type Reranker,
} from "@corpusai/corpus";

let embeddingService: EmbeddingService;
let chunker: TokenChunker;
let reranker: Reranker;
let initialized = false;

function init(): void {
  if (initialized) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY required");

  const baseEmbeddings = new OpenAIEmbeddingService({
    apiKey,
    model: "text-embedding-3-small",
  });

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });

    const cache: CacheService = {
      get: (key: string) => redis.get(key),
      set: async (key: string, value: string, ttl?: number) => {
        if (ttl) await redis.setex(key, ttl, value);
        else await redis.set(key, value);
      },
      mget: (keys: string[]) => keys.length === 0 ? Promise.resolve([]) : redis.mget(...keys),
      mset: async (entries: Array<{ key: string; value: string }>, ttl?: number) => {
        if (entries.length === 0) return;
        const pipeline = redis.pipeline();
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
      keyPrefix: "emb:",
    });
  } else {
    embeddingService = baseEmbeddings;
  }

  chunker = new TokenChunker({ chunkSizeTokens: 400, overlapTokens: 50 });
  reranker = new HybridReranker();
  initialized = true;
}

export function createPipelineForAI(aiId: string): RAGPipelineImpl {
  init();

  const qdrantUrl = process.env.QDRANT_URL || "http://localhost:6333";
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
      apiKey: process.env.OPENAI_API_KEY!,
      model: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 1000,
    },
    reranker,
  );
}
