import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response } from 'express';
import type Redis from 'ioredis';
import type { ApiKeyRequest } from '../auth';

@Injectable()
export class ApiKeyRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiKeyRateLimitInterceptor.name);
  private readonly limit: number;

  constructor(
    @Optional() @Inject('RATE_LIMIT_REDIS') private readonly redis: Redis | null,
    private readonly config: ConfigService
  ) {
    this.limit = this.config.get<number>('API_KEY_RATE_LIMIT', 60);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const keyHash = request.apiKeyHash;
    if (!keyHash || !this.redis) {
      // Not an API key request or Redis unavailable — skip
      return next.handle();
    }

    const windowStart = Math.floor(Date.now() / 60000);
    const redisKey = `ratelimit:apikey:${keyHash}:${windowStart}`;
    const windowResetEpoch = (windowStart + 1) * 60;

    let count: number;
    try {
      count = await this.redis.incr(redisKey);
      if (count === 1) {
        await this.redis.expire(redisKey, 120);
      }
    } catch (err) {
      this.logger.warn(`Redis rate limit check failed, allowing request: ${String(err)}`);
      return next.handle();
    }

    const remaining = Math.max(0, this.limit - count);

    // Set headers before checking limit (so 429 responses also have them)
    response.setHeader('X-RateLimit-Limit', this.limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', windowResetEpoch);

    if (count > this.limit) {
      const retryAfter = windowResetEpoch - Math.floor(Date.now() / 1000);
      response.setHeader('Retry-After', Math.max(1, retryAfter));
      throw new HttpException(
        {
          statusCode: 429,
          message: 'API rate limit exceeded',
          retryAfter: Math.max(1, retryAfter),
        },
        429
      );
    }

    return next.handle().pipe(
      tap(() => {
        // Headers already set above
      })
    );
  }
}
