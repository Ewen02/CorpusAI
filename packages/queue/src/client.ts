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
  const username = parsed.username || undefined;

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username,
    password,
    maxRetriesPerRequest: null,
    // Fail fast on connect instead of hanging: a producer .add() that can't
    // reach Redis should reject in seconds, not leave the HTTP handler pending
    // until the client times out (observed as 300s/HTTP 499 on Railway).
    connectTimeout: 10_000,
    // Railway's private network resolves *.railway.internal on both IPv4 and
    // IPv6 depending on the service. family: 0 lets ioredis try both (dual
    // stack) instead of forcing IPv6-only (family: 6), which hangs when Redis
    // only answers on IPv4.
    ...(isPrivateNetwork ? { family: 0 } : {}),
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
