import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ApiKeysController, PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { ApiKeyRateLimitInterceptor } from './api-key-rate-limit.interceptor';
import { RagModule } from '../rag';
import { AuthGuard } from '../auth';

@Module({
  imports: [RagModule],
  controllers: [ApiKeysController, PublicApiController],
  providers: [
    PublicApiService,
    AuthGuard,
    ApiKeyRateLimitInterceptor,
    {
      provide: 'RATE_LIMIT_REDIS',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return null;
        return new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
      },
    },
  ],
})
export class PublicApiModule {}
