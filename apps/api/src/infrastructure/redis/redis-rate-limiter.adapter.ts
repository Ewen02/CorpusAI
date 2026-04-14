import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import type { IRateLimiter, RateLimitResult } from './rate-limiter.port';

export const RATE_LIMIT_REDIS = 'RATE_LIMIT_REDIS';

@Injectable()
export class RedisRateLimiterAdapter implements IRateLimiter {
  private readonly logger = new Logger(RedisRateLimiterAdapter.name);

  constructor(@Optional() @Inject(RATE_LIMIT_REDIS) private readonly redis: Redis | null) {}

  async checkAndIncrement(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult | null> {
    if (!this.redis) return null;

    const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
    const redisKey = `${key}:${windowStart}`;
    const resetAt = (windowStart + 1) * windowSeconds;

    try {
      const count = await this.redis.incr(redisKey);
      if (count === 1) {
        // TTL slightly longer than window to avoid race conditions at boundary
        await this.redis.expire(redisKey, windowSeconds * 2);
      }
      return {
        count,
        limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch (err) {
      this.logger.warn(`Rate limit check failed: ${String(err)}`);
      return null;
    }
  }
}
