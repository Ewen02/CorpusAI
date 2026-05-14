import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './conversations.repository';
import { EndUserMemoryService } from './memory.service';
import { MemoryRepository } from './memory.repository';
import { AccessControlService } from './access-control.service';
import { MessageHistoryService } from './message-history.service';
import { RagOrchestratorService } from './rag-orchestrator.service';
import { RagModule } from '../rag';

@Module({
  imports: [RagModule, ConfigModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsRepository,
    EndUserMemoryService,
    MemoryRepository,
    AccessControlService,
    MessageHistoryService,
    RagOrchestratorService,
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}
