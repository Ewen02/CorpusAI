import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './conversations.repository';
import { EndUserMemoryService } from './memory.service';
import { RagModule } from '../rag';

@Module({
  imports: [RagModule, ConfigModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsRepository, EndUserMemoryService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
