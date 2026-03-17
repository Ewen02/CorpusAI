import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  OpenAIEmbeddingService,
  QdrantVectorStore,
  TokenChunker,
  RAGPipelineImpl,
  HybridReranker,
  CachedEmbeddingService,
  type LLMConfig,
  type EmbeddingService,
  type CacheService,
  type CacheMetrics,
  type Reranker,
} from '@corpusai/corpus';

/**
 * Factory pour créer des pipelines RAG par AI.
 * Chaque AI a sa propre collection Qdrant (isolation des données).
 *
 * Fonctionnalités:
 * - TokenChunker: chunking basé sur les tokens (tiktoken)
 * - HybridReranker: reranking BM25 + sémantique
 * - CachedEmbeddingService: cache Redis des embeddings (optionnel)
 */
@Injectable()
export class RagPipelineFactory implements OnModuleDestroy {
  private readonly logger = new Logger(RagPipelineFactory.name);
  private embeddingService: EmbeddingService;
  private chunker: TokenChunker;
  private reranker: Reranker;
  private redis?: Redis;
  private readonly llmApiKey: string;
  private readonly llmBaseURL?: string;
  private readonly llmModel: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }

    // LLM config: supports OpenRouter, Together, Groq, or any OpenAI-compatible provider
    this.llmApiKey = this.configService.get<string>('LLM_API_KEY') || apiKey;
    this.llmBaseURL = this.configService.get<string>('LLM_BASE_URL');
    this.llmModel = this.configService.get<string>('LLM_MODEL') || 'gpt-4o-mini';

    // Service d'embedding de base
    const baseEmbeddingService = new OpenAIEmbeddingService({
      apiKey,
      model: 'text-embedding-3-small',
    });

    // Cache Redis si configuré
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

    // TokenChunker: chunking basé sur les tokens (tiktoken cl100k_base)
    // - 400 tokens par chunk (optimal pour embeddings)
    // - 50 tokens d'overlap pour conserver le contexte
    this.chunker = new TokenChunker({
      chunkSizeTokens: 400,
      overlapTokens: 50,
    });

    // Reranker hybride (BM25 + sémantique)
    this.reranker = new HybridReranker();
    this.logger.log('Hybrid reranker enabled (60% semantic + 40% BM25)');
  }

  /**
   * Crée une interface CacheService compatible avec Redis.
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

  /**
   * Libère les ressources.
   */
  onModuleDestroy(): void {
    this.chunker.dispose();
    this.redis?.disconnect();
    this.logger.log('Resources released');
  }

  /**
   * Crée un pipeline RAG complet pour une AI spécifique.
   */
  createForAI(aiId: string, llmConfig?: Partial<LLMConfig>): RAGPipelineImpl {
    const vectorStore = this.createVectorStoreForAI(aiId);

    return new RAGPipelineImpl(
      this.embeddingService,
      vectorStore,
      this.chunker,
      {
        apiKey: this.llmApiKey,
        baseURL: this.llmBaseURL,
        model: llmConfig?.model || this.llmModel,
        temperature: llmConfig?.temperature ?? 0.2,
        maxTokens: llmConfig?.maxTokens ?? 1000,
        systemPrompt: llmConfig?.systemPrompt,
      },
      this.reranker
    );
  }

  /** Regex pour valider les aiId (alphanumeric, underscore, hyphen) */
  private static readonly AI_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

  /**
   * Valide le format d'un aiId pour éviter les injections dans les noms de collection.
   * @throws Error si le format est invalide
   */
  private validateAiId(aiId: string): void {
    if (!aiId || !RagPipelineFactory.AI_ID_PATTERN.test(aiId)) {
      throw new Error(
        `Invalid aiId format: "${aiId}". Must contain only alphanumeric characters, underscores, and hyphens.`
      );
    }
  }

  /**
   * Crée un vector store pour une AI (pour opérations de cleanup).
   * @throws Error si aiId contient des caractères non autorisés
   */
  createVectorStoreForAI(aiId: string): QdrantVectorStore {
    this.validateAiId(aiId);
    const qdrantUrl = this.configService.get<string>('QDRANT_URL');
    if (!qdrantUrl && process.env.NODE_ENV === 'production') {
      throw new Error('QDRANT_URL is required in production');
    }

    return new QdrantVectorStore({
      url: qdrantUrl || 'http://localhost:6333',
      collectionName: `ai_${aiId}`,
      vectorSize: this.embeddingService.dimensions,
    });
  }

  /**
   * Retourne les dimensions des embeddings.
   */
  get embeddingDimensions(): number {
    return this.embeddingService.dimensions;
  }

  /**
   * Indique si le cache Redis est actif.
   */
  get isCacheEnabled(): boolean {
    return !!this.redis;
  }

  /**
   * Retourne les métriques du cache d'embeddings.
   * @returns CacheMetrics si le cache est actif, null sinon
   */
  getCacheMetrics(): CacheMetrics | null {
    if (this.embeddingService instanceof CachedEmbeddingService) {
      return this.embeddingService.getMetrics();
    }
    return null;
  }

  /**
   * Retourne le service d'embedding (pour debug query).
   */
  getEmbeddingService(): EmbeddingService {
    return this.embeddingService;
  }
}
