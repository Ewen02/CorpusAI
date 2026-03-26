import { createHash } from 'crypto';
import type { EmbeddingService } from '../embeddings/types';
import type { CacheService } from './types';

/**
 * Métriques du cache d'embeddings.
 */
export interface CacheMetrics {
  /** Nombre de cache hits */
  hits: number;
  /** Nombre de cache misses */
  misses: number;
  /** Nombre total de requêtes */
  totalRequests: number;
  /** Taux de cache hit (0-1) */
  hitRate: number;
}

/**
 * Configuration pour le service d'embedding avec cache.
 */
export interface CachedEmbeddingConfig {
  /** Service d'embedding sous-jacent (OpenAI, etc.) */
  baseService: EmbeddingService;
  /** Service de cache (Redis, etc.) */
  cache: CacheService;
  /** Durée de vie en secondes. Défaut: 604800 (7 jours) */
  ttlSeconds?: number;
  /** Préfixe des clés de cache. Défaut: 'emb:' */
  keyPrefix?: string;
  /** Callback optionnel pour les erreurs de cache */
  onCacheError?: (error: Error, operation: 'get' | 'set' | 'mget' | 'mset') => void;
}

/**
 * Service d'embedding avec cache.
 *
 * Wrapper autour d'un EmbeddingService qui cache les embeddings calculés
 * pour éviter les appels API redondants et réduire les coûts.
 *
 * Caractéristiques:
 * - Cache transparent (même interface que EmbeddingService)
 * - Support du batch avec optimisation (ne fetch que les manquants)
 * - Fire-and-forget pour le stockage (ne bloque pas le retour)
 * - Clés basées sur hash SHA-256 du texte
 *
 * @example
 * ```typescript
 * const baseService = new OpenAIEmbeddingService({ apiKey: '...' });
 * const cachedService = new CachedEmbeddingService({
 *   baseService,
 *   cache: redisCache,
 *   ttlSeconds: 86400 * 7, // 7 jours
 * });
 *
 * // Premier appel: cache miss, appel API
 * const emb1 = await cachedService.embed('Hello world');
 *
 * // Deuxième appel: cache hit, pas d'appel API
 * const emb2 = await cachedService.embed('Hello world');
 * ```
 */
export class CachedEmbeddingService implements EmbeddingService {
  private readonly ttl: number;
  private readonly prefix: string;
  private readonly metrics = { hits: 0, misses: 0 };

  constructor(private readonly config: CachedEmbeddingConfig) {
    this.ttl = config.ttlSeconds ?? 604800; // 7 jours par défaut
    this.prefix = config.keyPrefix ?? 'emb:';
  }

  /**
   * Retourne les métriques actuelles du cache.
   */
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      totalRequests: total,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }

  /**
   * Réinitialise les métriques.
   */
  resetMetrics(): void {
    this.metrics.hits = 0;
    this.metrics.misses = 0;
  }

  /**
   * Dimensions du vecteur d'embedding (délégué au service de base).
   */
  get dimensions(): number {
    return this.config.baseService.dimensions;
  }

  /**
   * Modèle utilisé (délégué au service de base).
   */
  get model(): string {
    return this.config.baseService.model;
  }

  /**
   * Génère une clé de cache à partir du texte.
   * Includes dimensions in the key to invalidate cache when switching
   * embedding dimensions (e.g. 1536d → 512d Matryoshka migration).
   */
  private hashText(text: string): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return `${this.prefix}${this.dimensions}:${hash}`;
  }

  /**
   * Génère un embedding pour un texte, avec cache.
   */
  async embed(text: string): Promise<number[]> {
    const key = this.hashText(text);

    // Essayer le cache d'abord
    try {
      const cached = await this.config.cache.get(key);
      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached) as number[];
      }
    } catch (error) {
      this.config.onCacheError?.(error as Error, 'get');
    }

    // Cache miss: appeler l'API
    this.metrics.misses++;
    const embedding = await this.config.baseService.embed(text);

    // Stocker en cache (fire and forget)
    this.config.cache.set(key, JSON.stringify(embedding), this.ttl).catch((error) => {
      this.config.onCacheError?.(error as Error, 'set');
    });

    return embedding;
  }

  /**
   * Génère des embeddings pour plusieurs textes, avec cache optimisé.
   *
   * Optimisation:
   * 1. Vérifie le cache pour tous les textes
   * 2. N'appelle l'API que pour les textes manquants
   * 3. Stocke les nouveaux embeddings en cache
   * 4. Retourne les résultats dans l'ordre original
   */
  async embedBatch(texts: string[], batchSize?: number): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const keys = texts.map((t) => this.hashText(t));

    // 1. Vérifier le cache pour tous les textes
    let cached: (string | null)[];
    try {
      cached = await this.config.cache.mget(keys);
    } catch (error) {
      this.config.onCacheError?.(error as Error, 'mget');
      // En cas d'erreur cache, traiter tous comme manquants
      cached = keys.map(() => null);
    }

    // 2. Identifier les cache misses
    const missingIndices: number[] = [];
    const missingTexts: string[] = [];
    const results: (number[] | null)[] = cached.map((c, i) => {
      if (c) {
        try {
          this.metrics.hits++;
          return JSON.parse(c) as number[];
        } catch {
          // JSON invalide, traiter comme manquant
        }
      }
      this.metrics.misses++;
      missingIndices.push(i);
      missingTexts.push(texts[i]!);
      return null;
    });

    // 3. Récupérer les embeddings manquants via l'API
    if (missingTexts.length > 0) {
      const newEmbeddings = await this.config.baseService.embedBatch(missingTexts, batchSize);

      // 4. Remplir les résultats et préparer le cache
      const toCache: Array<{ key: string; value: string }> = [];

      missingIndices.forEach((originalIndex, fetchIndex) => {
        const emb = newEmbeddings[fetchIndex];
        if (emb) {
          results[originalIndex] = emb;
          toCache.push({
            key: keys[originalIndex]!,
            value: JSON.stringify(emb),
          });
        }
      });

      // 5. Stocker en cache (fire and forget)
      if (toCache.length > 0) {
        this.config.cache.mset(toCache, this.ttl).catch((error) => {
          this.config.onCacheError?.(error as Error, 'mset');
        });
      }
    }

    // Vérifier que tous les résultats sont présents
    return results.map((r, i) => {
      if (!r) {
        throw new Error(`Failed to get embedding for text at index ${i}`);
      }
      return r;
    });
  }
}
