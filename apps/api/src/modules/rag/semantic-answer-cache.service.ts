import { Injectable, Logger } from '@nestjs/common';
import { answerCacheVersionKey } from '@corpusai/queue';
import { RagPipelineFactory } from './rag-pipeline.factory';

/** Entrée du cache : question embedée + réponse complète prête à servir */
export interface CachedAnswer {
  question: string;
  answer: string;
  sources: unknown[];
  confidence: string;
  createdAt: string;
}

interface CacheEntry extends CachedAnswer {
  embedding: number[];
}

/** Similarité cosinus minimale pour considérer deux questions équivalentes */
const SIMILARITY_THRESHOLD = 0.97;
/** Nombre max d'entrées conservées par AI (ring buffer) */
const MAX_ENTRIES_PER_AI = 50;
/** TTL des entrées (24 h) — les réponses ne survivent pas à une journée */
const ENTRY_TTL_SECONDS = 60 * 60 * 24;

/**
 * Cache sémantique de réponses : les questions récurrentes d'un widget public
 * (FAQ) obtiennent une réponse instantanée sans appel LLM ni retrieval.
 *
 * Fonctionnement :
 * - store : embedding de la question + réponse, dans une liste Redis par AI,
 *   espace de noms versionné (`anscache:{aiId}:{ver}:entries`), TTL 24 h,
 *   ring buffer de 50 entrées.
 * - lookup : embedding de la question entrante (déjà mémoïsé par le cache
 *   d'embeddings Redis), similarité cosinus contre les entrées, hit si ≥ 0.97.
 * - invalidate : INCR de la version (`anscache:ver:{aiId}`) — même clé que
 *   celle utilisée par l'ai-worker après ré-indexation. Les anciennes listes
 *   meurent par TTL.
 *
 * Sécurité de fraîcheur : seules les réponses HIGH confidence avec sources
 * sont mises en cache (décision côté appelant), et toute modification du
 * corpus invalide immédiatement.
 *
 * No-op complet si Redis n'est pas configuré.
 */
@Injectable()
export class SemanticAnswerCacheService {
  private readonly logger = new Logger(SemanticAnswerCacheService.name);

  constructor(private readonly factory: RagPipelineFactory) {}

  get isEnabled(): boolean {
    return this.factory.getRedis() !== null;
  }

  /**
   * Recherche une réponse en cache pour une question sémantiquement équivalente.
   * Retourne null sur miss, cache désactivé, ou toute erreur (best-effort).
   */
  async lookup(aiId: string, question: string): Promise<CachedAnswer | null> {
    const redis = this.factory.getRedis();
    if (!redis) return null;

    try {
      const version = (await redis.get(answerCacheVersionKey(aiId))) ?? '0';
      const listKey = this.entriesKey(aiId, version);
      const rawEntries = await redis.lrange(listKey, 0, MAX_ENTRIES_PER_AI - 1);
      if (rawEntries.length === 0) return null;

      // Embedding de la question — passe par le cache d'embeddings Redis :
      // le pipeline réutilisera ce même embedding en cas de miss.
      const questionEmbedding = await this.factory.getEmbeddingService().embed(question);

      let best: { entry: CacheEntry; similarity: number } | null = null;
      for (const raw of rawEntries) {
        let entry: CacheEntry;
        try {
          entry = JSON.parse(raw) as CacheEntry;
        } catch {
          continue;
        }
        if (!Array.isArray(entry.embedding) || entry.embedding.length === 0) continue;
        const similarity = this.cosineSimilarity(questionEmbedding, entry.embedding);
        if (similarity >= SIMILARITY_THRESHOLD && (!best || similarity > best.similarity)) {
          best = { entry, similarity };
        }
      }

      if (!best) return null;

      this.logger.log(
        `Semantic cache HIT for AI ${aiId} (similarity ${best.similarity.toFixed(4)})`
      );
      const { embedding: _embedding, ...cached } = best.entry;
      return cached;
    } catch (error) {
      this.logger.warn(`Semantic cache lookup failed: ${error}`);
      return null;
    }
  }

  /**
   * Met une réponse en cache (fire-and-forget côté appelant).
   * L'appelant est responsable du filtre qualité (HIGH confidence + sources).
   */
  async store(
    aiId: string,
    question: string,
    answer: string,
    sources: unknown[],
    confidence: string
  ): Promise<void> {
    const redis = this.factory.getRedis();
    if (!redis) return;

    try {
      const version = (await redis.get(answerCacheVersionKey(aiId))) ?? '0';
      const listKey = this.entriesKey(aiId, version);
      const embedding = await this.factory.getEmbeddingService().embed(question);

      const entry: CacheEntry = {
        embedding,
        question,
        answer,
        sources,
        confidence,
        createdAt: new Date().toISOString(),
      };

      await redis
        .multi()
        .lpush(listKey, JSON.stringify(entry))
        .ltrim(listKey, 0, MAX_ENTRIES_PER_AI - 1)
        .expire(listKey, ENTRY_TTL_SECONDS)
        .exec();
    } catch (error) {
      this.logger.warn(`Semantic cache store failed: ${error}`);
    }
  }

  /**
   * Invalide toutes les réponses en cache d'une AI (corpus modifié).
   * Même mécanisme que l'ai-worker après ré-indexation : INCR de la version.
   */
  async invalidate(aiId: string): Promise<void> {
    const redis = this.factory.getRedis();
    if (!redis) return;

    try {
      await redis.incr(answerCacheVersionKey(aiId));
    } catch (error) {
      this.logger.warn(`Semantic cache invalidation failed: ${error}`);
    }
  }

  private entriesKey(aiId: string, version: string): string {
    return `anscache:${aiId}:${version}:entries`;
  }

  /**
   * Similarité cosinus entre deux vecteurs de même dimension.
   * Retourne 0 si les dimensions divergent (ex: migration d'embeddings).
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
