import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeysController, PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { PublicApiRepository } from './public-api.repository';
import { ApiKeyRateLimitInterceptor } from './api-key-rate-limit.interceptor';
import { RagModule } from '../rag';
import { AuthGuard, ApiKeyGuard, AuthRepository } from '../auth';

@Module({
  imports: [ConfigModule, RagModule],
  controllers: [ApiKeysController, PublicApiController],
  providers: [
    PublicApiService,
    PublicApiRepository,
    AuthGuard,
    ApiKeyGuard,
    AuthRepository,
    ApiKeyRateLimitInterceptor,
  ],
})
export class PublicApiModule {}
