import Redis from 'ioredis';
import {
  REDIS_CHANNELS,
  parseRedisUrl,
  answerCacheVersionKey,
  type DocumentProgressEvent,
  type DocumentFinalFailureEvent,
} from '@corpusai/queue';
import { logger } from '../lib/logger';

export class ProgressService {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis({ ...parseRedisUrl(redisUrl), maxRetriesPerRequest: null });
    // Prevent unhandled 'error' events (e.g. Railway proxy ECONNRESET) from
    // crashing the worker; ioredis reconnects on its own.
    this.redis.on('error', (err) => logger.warn({ err }, 'progress Redis error'));
  }

  async publish(event: DocumentProgressEvent): Promise<void> {
    try {
      await this.redis.publish(REDIS_CHANNELS.DOCUMENT_PROGRESS, JSON.stringify(event));
    } catch (error) {
      // Don't crash document processing if progress notification fails
      logger.warn({ err: error, documentId: event.documentId }, 'Failed to publish progress event');
    }
  }

  async publishFinalFailure(event: DocumentFinalFailureEvent): Promise<void> {
    try {
      await this.redis.publish(REDIS_CHANNELS.DOCUMENT_FINAL_FAILURE, JSON.stringify(event));
    } catch (error) {
      logger.warn(
        { err: error, documentId: event.documentId },
        'Failed to publish final failure event'
      );
    }
  }

  /**
   * Invalide le cache sémantique de réponses d'une AI (même clé versionnée que
   * l'API) — appelé après chaque (ré)indexation réussie : les réponses en cache
   * peuvent contredire le nouveau contenu du corpus.
   */
  async invalidateAnswerCache(aiId: string): Promise<void> {
    try {
      await this.redis.incr(answerCacheVersionKey(aiId));
    } catch (error) {
      logger.warn({ err: error, aiId }, 'Failed to invalidate answer cache');
    }
  }

  async dispose(): Promise<void> {
    this.redis.disconnect();
  }
}

// Singleton instance
let instance: ProgressService | null = null;

export function getProgressService(): ProgressService {
  if (!instance) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL required');
    instance = new ProgressService(redisUrl);
  }
  return instance;
}

export async function disposeProgressService(): Promise<void> {
  if (instance) {
    await instance.dispose();
    instance = null;
  }
}
