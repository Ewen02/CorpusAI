import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagPipelineFactory } from './rag-pipeline.factory';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { TextGenerationService } from './text-generation.service';
import { TextGenerationRepository } from './text-generation.repository';
import { AuthGuard } from '../auth';

@Module({
  imports: [ConfigModule],
  controllers: [RagController],
  providers: [
    RagPipelineFactory,
    RagService,
    TextGenerationService,
    TextGenerationRepository,
    AuthGuard,
  ],
  exports: [RagPipelineFactory, RagService, TextGenerationService],
})
export class RagModule {}
