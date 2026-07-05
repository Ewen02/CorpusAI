import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_NAMES } from './constants';
import type { DocumentProcessingJobData } from './types';

export function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const isSecure = parsed.protocol === 'rediss:';
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  // Railway wires Redis two ways, both plaintext by design: the private
  // network (*.railway.internal) and the TCP proxy (*.rlwy.net / *.railway.app).
  // Neither exposes a public port to the internet, so requiring TLS on them is
  // wrong and previously crashed the service at boot.
  const isRailwayInternal =
    parsed.hostname.endsWith('.railway.internal') || parsed.hostname.endsWith('.svc.cluster.local');
  const isRailwayProxy =
    parsed.hostname.endsWith('.rlwy.net') || parsed.hostname.endsWith('.railway.app');
  const isTrustedNetwork = isLocal || isRailwayInternal || isRailwayProxy;
  const isProd = process.env.NODE_ENV === 'production';

  // Warn (do not throw) on a genuinely public, non-TLS Redis in production —
  // a boot-time crash is a worse failure mode than a plaintext connection to
  // an already-authenticated host. Set REDIS_ALLOW_NO_TLS=true to silence.
  if (isProd && !isTrustedNetwork && !isSecure && process.env.REDIS_ALLOW_NO_TLS !== 'true') {
    console.warn(
      `[queue] Redis connection to ${parsed.hostname} is not using TLS in production. ` +
        "Prefer 'rediss://' for public endpoints, or set REDIS_ALLOW_NO_TLS=true to silence this warning."
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
    // Survive transient drops (Railway's TCP proxy resets idle connections with
    // ECONNRESET): keep reconnecting with capped backoff instead of surfacing an
    // unhandled error event that can take the process down.
    retryStrategy: (times: number) => Math.min(times * 200, 5_000),
    reconnectOnError: () => true,
    // Railway's private network resolves *.railway.internal on both IPv4 and
    // IPv6 depending on the service. family: 0 lets ioredis try both (dual
    // stack) instead of forcing IPv6-only (family: 6), which hangs when Redis
    // only answers on IPv4. The public proxy uses ordinary IPv4, so leave it
    // to ioredis' default.
    ...(isRailwayInternal ? { family: 0 } : {}),
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
