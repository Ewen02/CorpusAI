import { Module } from '@nestjs/common';
import { ApiKeysController, PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { PublicApiRepository } from './public-api.repository';
import { ApiKeyRateLimitInterceptor } from './api-key-rate-limit.interceptor';
import { RagModule } from '../rag';
import { AuthGuard } from '../auth';

@Module({
  imports: [RagModule],
  controllers: [ApiKeysController, PublicApiController],
  providers: [PublicApiService, PublicApiRepository, AuthGuard, ApiKeyRateLimitInterceptor],
})
export class PublicApiModule {}
