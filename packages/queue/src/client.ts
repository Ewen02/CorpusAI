import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_NAMES } from './constants';
import type { DocumentProcessingJobData } from './types';

export function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const isSecure = parsed.protocol === 'rediss:';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  const isPrivateNetwork =
    parsed.hostname.endsWith('.railway.internal') || parsed.hostname.endsWith('.svc.cluster.local');
  const isProd = process.env.NODE_ENV === 'production';
  const tlsRequired = isProd && !isLocal && !isPrivateNetwork && !isSecure;

  if (tlsRequired && process.env.REDIS_ALLOW_NO_TLS !== 'true') {
    throw new Error(
      "Redis must use TLS in production. Use 'rediss://' or set REDIS_ALLOW_NO_TLS=true for private networks."
    );
  }

  const password = parsed.password || undefined;

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password,
    maxRetriesPerRequest: null,
    // Railway's private network (*.railway.internal) is IPv6-only; ioredis
    // defaults to IPv4 DNS resolution and would fail with ENOTFOUND.
    ...(isPrivateNetwork ? { family: 6 } : {}),
    ...(isSecure ? { tls: { rejectUnauthorized: true } } : {}),
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

/**
 * Dead-letter queue for documents that exhausted all retries.
 * The worker should move final failures here (with the same payload) so an admin
 * can inspect or retry them via the admin/failed-jobs endpoint without losing data.
 */
export function createDocumentDLQ(
  connection: RedisOptions | string
): Queue<DocumentProcessingJobData & { errorMessage: string; failedAt: string }> {
  const redisOpts: RedisOptions =
    typeof connection === 'string'
      ? parseRedisUrl(connection)
      : { ...connection, maxRetriesPerRequest: null };

  return new Queue<DocumentProcessingJobData & { errorMessage: string; failedAt: string }>(
    QUEUE_NAMES.DOCUMENT_DLQ,
    { connection: redisOpts }
  );
}
