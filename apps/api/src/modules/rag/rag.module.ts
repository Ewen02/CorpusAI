import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagPipelineFactory } from './rag-pipeline.factory';
import { RagService } from './rag.service';

@Module({
  imports: [ConfigModule],
  providers: [RagPipelineFactory, RagService],
  exports: [RagService],
})
export class RagModule {}
