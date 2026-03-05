import { Module } from '@nestjs/common';
import { ApiKeysController, PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { RagModule } from '../rag';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  imports: [RagModule],
  controllers: [ApiKeysController, PublicApiController],
  providers: [PublicApiService, AuthGuard],
})
export class PublicApiModule {}
