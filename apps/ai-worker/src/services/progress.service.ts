import Redis from "ioredis";
import { REDIS_CHANNELS, type DocumentProgressEvent } from "@corpusai/queue";

export class ProgressService {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  async publish(event: DocumentProgressEvent): Promise<void> {
    await this.redis.publish(
      REDIS_CHANNELS.DOCUMENT_PROGRESS,
      JSON.stringify(event),
    );
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
    if (!redisUrl) throw new Error("REDIS_URL required");
    instance = new ProgressService(redisUrl);
  }
  return instance;
}
