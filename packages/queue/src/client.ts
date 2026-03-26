import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_NAMES } from './constants';
import type { DocumentProcessingJobData } from './types';

function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const isSecure = parsed.protocol === 'rediss:';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !isLocal && !isSecure) {
    throw new Error(
      "Redis must use TLS in production. Use 'rediss://' instead of 'redis://' in REDIS_URL."
    );
  }

  const password = parsed.password || undefined;
  if (isProd && !isLocal && !password) {
    throw new Error('Redis requires a password in production. Add credentials to REDIS_URL.');
  }

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password,
    maxRetriesPerRequest: null,
    ...(isSecure || (isProd && !isLocal) ? { tls: { rejectUnauthorized: true } } : {}),
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
