import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  resolveModelConfig,
  type LLMConfig,
  type EmbeddingService,
  type CacheService,
  type CacheMetrics,
  type AsyncReranker,
} from '@corpusai/corpus';
import { LLMProviderFactory, type LLMProvider } from '../../infrastructure/llm';

/**
 * Factory pour créer des pipelines RAG par AI.
 *
 * Architecture:
 * - Collection globale unique "corpus_vectors" avec multi-tenancy via filtre ai_id
 * - Embeddings 512d Matryoshka (text-embedding-3-small)
 * - Hybrid search: dense + sparse (BM25 IDF natif Qdrant) avec RRF fusion
 * - CohereReranker optionnel comme post-processing
 * - Scalar quantization int8 + HNSW per-tenant
 */
@Injectable()
export class RagPipelineFactory implements OnModuleDestroy {
  private readonly logger = new Logger(RagPipelineFactory.name);
  private embeddingService: EmbeddingService;
  private sparseGenerator: SparseVectorGenerator;
  private vectorStore: QdrantVectorStore;
  private chunker: ParentChildChunker;
  private reranker?: AsyncReranker;
  private redis?: Redis;
  private readonly llmApiKey: string;
  private readonly llmBaseURL?: string;
  private readonly llmModel: string;

  constructor(
    private configService: ConfigService,
    private readonly llmProviderFactory: LLMProviderFactory
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    // LLM config: supports OpenRouter, Together, Groq, or any OpenAI-compatible provider
    this.llmApiKey = this.configService.get<string>('LLM_API_KEY') || apiKey;
    this.llmBaseURL = this.configService.get<string>('LLM_BASE_URL');
    this.llmModel = this.configService.get<string>('LLM_MODEL') || 'gpt-4o-mini';

    // Embedding service: 512d Matryoshka (3x less memory, same recall)
    const baseEmbeddingService = new OpenAIEmbeddingService({
      apiKey,
      model: 'text-embedding-3-small',
      dimensions: 512,
    });

    // Redis cache (optional)
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.logger.log('Redis configured, enabling embedding cache');
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
      });

      this.redis.on('error', (err: Error) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });

      this.embeddingService = new CachedEmbeddingService({
        baseService: baseEmbeddingService,
        cache: this.createRedisCache(),
        ttlSeconds: parseInt(this.configService.get<string>('EMBEDDING_CACHE_TTL') || '604800', 10),
        keyPrefix: 'emb:',
      });
    } else {
      this.logger.log('Redis not configured, embedding cache disabled');
      this.embeddingService = baseEmbeddingService;
    }

    // Sparse vector generator for BM25 hybrid search (Qdrant applies IDF server-side)
    this.sparseGenerator = new SparseVectorGenerator();

    // Global vector store (single collection, multi-tenant)
    const qdrantUrl = this.configService.get<string>('QDRANT_URL');
    if (!qdrantUrl && process.env.NODE_ENV === 'production') {
      throw new Error('QDRANT_URL is required in production');
    }
    this.vectorStore = new QdrantVectorStore({
      url: qdrantUrl || 'http://localhost:6333',
      apiKey: this.configService.get<string>('QDRANT_API_KEY'),
    });

    // Chunker: centralized defaults (child 128t, parent 512t, overlap 32t)
    this.chunker = new ParentChildChunker(CHUNKER_DEFAULTS);

    // CohereReranker (optional, applied after RRF fusion)
    const cohereApiKey = this.configService.get<string>('COHERE_API_KEY');
    if (cohereApiKey) {
      this.reranker = new CohereReranker({ apiKey: cohereApiKey });
      this.logger.log('Cohere cross-encoder reranker enabled (post-RRF)');
    } else {
      this.logger.log('No Cohere API key — using Qdrant native RRF hybrid search only');
    }
  }

  /**
   * Creates a Redis-backed CacheService.
   */
  private createRedisCache(): CacheService {
    const redis = this.redis!;

    return {
      get: async (key: string): Promise<string | null> => {
        return redis.get(key);
      },

      set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
        if (ttlSeconds) {
          await redis.setex(key, ttlSeconds, value);
        } else {
          await redis.set(key, value);
        }
      },

      mget: async (keys: string[]): Promise<(string | null)[]> => {
        if (keys.length === 0) return [];
        return redis.mget(...keys);
      },

      mset: async (
        entries: Array<{ key: string; value: string }>,
        ttlSeconds?: number
      ): Promise<void> => {
        if (entries.length === 0) return;

        const pipeline = redis.pipeline();
        for (const { key, value } of entries) {
          if (ttlSeconds) {
            pipeline.setex(key, ttlSeconds, value);
          } else {
            pipeline.set(key, value);
          }
        }
        await pipeline.exec();
      },
    };
  }

  onModuleDestroy(): void {
    this.chunker.dispose();
    this.sparseGenerator.dispose();
    this.redis?.disconnect();
    this.logger.log('Resources released');
  }

  /**
   * Creates a RAG pipeline for a specific AI.
   * Uses the shared global collection with ai_id tenant filtering.
   *
   * Provider routing:
   * - `openai` (default): uses the OpenAI SDK with the configured base URL.
   * - `groq`: OpenAI-compatible — switches `baseURL` to Groq and reuses
   *   `GROQ_API_KEY`. The model identifier is forwarded as-is.
   * - `anthropic`: not natively wired into the corpus pipeline because the
   *   OpenAI SDK cannot speak the Messages API. The factory falls back to
   *   OpenAI for retrieval-augmented chat and emits a one-time warning;
   *   tasks that do not require streaming (suggestions, summaries) still
   *   route through `LLMProviderFactory.resolve()` and use the Anthropic
   *   adapter directly.
   */
  createForAI(aiId: string, llmConfig?: Partial<LLMConfig>): RAGPipelineImpl {
    this.validateAiId(aiId);

    const provider = (llmConfig?.provider ?? 'openai') as LLMProvider;
    const requestedModel = llmConfig?.model || this.llmModel;
    const providerConfig = this.resolveProviderConfig(provider, requestedModel);

    return new RAGPipelineImpl(
      aiId,
      this.embeddingService,
      this.vectorStore,
      this.sparseGenerator,
      this.chunker,
      {
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL,
        model: providerConfig.model,
        provider: providerConfig.provider,
        temperature: llmConfig?.temperature ?? 0.2,
        maxTokens: llmConfig?.maxTokens ?? 1000,
        systemPrompt: llmConfig?.systemPrompt,
      },
      this.reranker
    );
  }

  /**
   * Returns the (apiKey, baseURL, model) tuple the corpus pipeline should use.
   * Falls back to OpenAI when the requested provider is unavailable so
   * end-users never hit a 500 due to a missing key.
   */
  private resolveProviderConfig(
    provider: LLMProvider,
    requestedModel: string
  ): { apiKey: string; baseURL?: string; model: string; provider: LLMProvider } {
    if (provider === 'groq') {
      const groqKey = this.configService.get<string>('GROQ_API_KEY');
      if (groqKey) {
        return {
          apiKey: groqKey,
          baseURL:
            this.configService.get<string>('GROQ_BASE_URL') || 'https://api.groq.com/openai/v1',
          model: requestedModel,
          provider: 'groq',
        };
      }
      this.logger.warn(
        `GROQ_API_KEY missing — RAG pipeline for model "${requestedModel}" falls back to OpenAI.`
      );
    }

    if (provider === 'anthropic') {
      // The corpus pipeline talks OpenAI Chat Completions wire format.
      // For Anthropic chat we'd need a parallel `AnthropicRAGPipeline`; until
      // then, route to OpenAI to keep the user-facing flow working.
      this.logger.warn(
        `Anthropic streaming RAG is not yet wired into the corpus pipeline ` +
          `(model "${requestedModel}"). Falling back to OpenAI for this call.`
      );
    }

    // OpenAI path (default + fallback).
    const resolved = resolveModelConfig(requestedModel, {
      OPENAI_API_KEY: this.configService.get<string>('OPENAI_API_KEY') || '',
      MISTRAL_API_KEY: this.configService.get<string>('MISTRAL_API_KEY') || '',
    });

    return {
      apiKey: resolved?.apiKey || this.llmApiKey,
      baseURL: resolved?.baseURL || this.llmBaseURL,
      model: resolved?.model || requestedModel,
      provider: 'openai',
    };
  }

  private static readonly AI_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

  private validateAiId(aiId: string): void {
    if (!aiId || !RagPipelineFactory.AI_ID_PATTERN.test(aiId)) {
      throw new Error(
        `Invalid aiId format: "${aiId}". Must contain only alphanumeric characters, underscores, and hyphens.`
      );
    }
  }

  /**
   * Returns the shared vector store (for delete and debug operations).
   */
  getVectorStore(): QdrantVectorStore {
    return this.vectorStore;
  }

  /**
   * Returns the shared sparse vector generator.
   */
  getSparseGenerator(): SparseVectorGenerator {
    return this.sparseGenerator;
  }

  get embeddingDimensions(): number {
    return this.embeddingService.dimensions;
  }

  get isCacheEnabled(): boolean {
    return !!this.redis;
  }

  getCacheMetrics(): CacheMetrics | null {
    if (this.embeddingService instanceof CachedEmbeddingService) {
      return this.embeddingService.getMetrics();
    }
    return null;
  }

  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }
}
