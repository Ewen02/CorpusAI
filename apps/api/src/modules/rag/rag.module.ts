import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagPipelineFactory } from './rag-pipeline.factory';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RagController],
  providers: [RagPipelineFactory, RagService],
  exports: [RagService],
})
export class RagModule {}
