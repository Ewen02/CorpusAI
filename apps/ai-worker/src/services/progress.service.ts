import Redis from 'ioredis';
import { REDIS_CHANNELS, type DocumentProgressEvent } from '@corpusai/queue';

export class ProgressService {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  async publish(event: DocumentProgressEvent): Promise<void> {
    try {
      await this.redis.publish(REDIS_CHANNELS.DOCUMENT_PROGRESS, JSON.stringify(event));
    } catch (error) {
      // Don't crash document processing if progress notification fails
      console.warn(
        `[ProgressService] Failed to publish progress event: ${error instanceof Error ? error.message : error}`
      );
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
