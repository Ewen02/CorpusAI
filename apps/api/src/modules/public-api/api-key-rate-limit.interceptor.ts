import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Response } from 'express';
import { RATE_LIMITER, type IRateLimiter } from '../../infrastructure/redis';
import type { ApiKeyRequest } from '../auth';

@Injectable()
export class ApiKeyRateLimitInterceptor implements NestInterceptor {
  private readonly limit: number;

  constructor(
    @Inject(RATE_LIMITER) private readonly rateLimiter: IRateLimiter,
    private readonly config: ConfigService
  ) {
    this.limit = this.config.get<number>('API_KEY_RATE_LIMIT', 60);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const keyHash = request.apiKeyHash;
    if (!keyHash) {
      return next.handle();
    }

    const result = await this.rateLimiter.checkAndIncrement(
      `ratelimit:apikey:${keyHash}`,
      this.limit,
      60
    );

    // Fail open if rate limiter unavailable (Redis down or not configured)
    if (!result) return next.handle();

    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt);

    if (result.count > result.limit) {
      const retryAfter = result.resetAt - Math.floor(Date.now() / 1000);
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

    return next.handle().pipe(tap(() => {}));
  }
}
