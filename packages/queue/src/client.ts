import { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { QUEUE_NAMES } from './constants';
import type { DocumentProcessingJobData } from './types';

/**
 * Resolve ioredis' `family` option. An explicit REDIS_IP_FAMILY env var wins
 * (0 = dual-stack, 4 = IPv4, 6 = IPv6) so the transport can be flipped from the
 * Railway dashboard without a rebuild; otherwise default to IPv6 on the private
 * network (its egress is IPv6-only) and ioredis' default elsewhere.
 */
function resolveFamily(
  override: string | undefined,
  isRailwayInternal: boolean
): { family?: number } {
  if (override !== undefined && override !== '') {
    const parsed = Number(override);
    if (parsed === 0 || parsed === 4 || parsed === 6) {
      return parsed === 0 ? {} : { family: parsed };
    }
  }
  return isRailwayInternal ? { family: 6 } : {};
}

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
    // Railway's TCP proxy drops idle connections after a few seconds, which
    // surfaced as ECONNRESET every ~7s on the worker's blocking BRPOPLPUSH.
    // A short TCP keepAlive keeps the socket active so the proxy doesn't reap it.
    keepAlive: 5_000,
    // Do not let ioredis stop after the initial handshake fails, and drop the
    // offline command queue so a producer .add() rejects fast (garde-fou 503)
    // rather than buffering forever while disconnected.
    enableReadyCheck: true,
    // Survive transient drops: keep reconnecting with capped backoff instead of
    // surfacing an unhandled error event that can take the process down.
    retryStrategy: (times: number) => Math.min(times * 200, 5_000),
    reconnectOnError: () => true,
    // IP family selection. Railway's private network (*.railway.internal) is
    // IPv6-only for egress and needs family: 6 (plus "Enable Outbound IPv6" on
    // the service); the public TCP proxy is plain IPv4. REDIS_IP_FAMILY overrides
    // the heuristic (0 = dual-stack, 4 = IPv4, 6 = IPv6) so the transport can be
    // switched from the dashboard without a rebuild.
    ...resolveFamily(process.env.REDIS_IP_FAMILY, isRailwayInternal),
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
