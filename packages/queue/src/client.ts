import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_NAMES } from './constants';
import type { DocumentProcessingJobData } from './types';

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
    ...(parsed.protocol === 'rediss:' ? { tls: { rejectUnauthorized: true } } : {}),
  };
}

export function createDocumentQueue(
  connection: RedisOptions | string
): Queue<DocumentProcessingJobData> {
  const redisOpts: RedisOptions =
    typeof connection === 'string'
      ? parseRedisUrl(connection)
      : { ...connection, maxRetriesPerRequest: null };

  return new Queue<DocumentProcessingJobData>(QUEUE_NAMES.DOCUMENT_PROCESSING, {
    connection: redisOpts,
  });
}
