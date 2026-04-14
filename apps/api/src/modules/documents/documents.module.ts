import { Module, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { prisma } from '@corpusai/database';
import type { DocumentFinalFailureEvent, DocumentProgressEvent } from '@corpusai/queue';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentsRepository } from './documents.repository';
import { MAIL_SERVICE, type IMailService } from '../../infrastructure/mail';
import { EVENT_BUS, type IEventBus } from '../../infrastructure/redis';
import { WebhooksService } from '../webhooks';
import { RagModule } from '../rag';

@Module({
  imports: [RagModule, ConfigModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentsRepository],
  exports: [DocumentsService],
})
export class DocumentsModule implements OnModuleInit {
  private readonly logger = new Logger('DocumentsModule');

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(MAIL_SERVICE) private readonly mailService: IMailService,
    private readonly webhooksService: WebhooksService
  ) {}

  onModuleInit() {
    const emitter = this.eventBus.getEmitter();

    emitter.on('final-failure', (event: DocumentFinalFailureEvent) => {
      this.handleFinalFailure(event).catch((err) => {
        this.logger.error(`Failed to handle final failure event: ${err}`);
      });
    });

    emitter.on('progress', (event: DocumentProgressEvent) => {
      if (event.status === 'INDEXED') {
        this.handleDocumentIndexed(event).catch((err) => {
          this.logger.error(`Failed to handle document indexed event: ${err}`);
        });
      }
    });
  }

  private async handleFinalFailure(event: DocumentFinalFailureEvent): Promise<void> {
    const ai = await prisma.aI.findUnique({
      where: { id: event.aiId },
      select: {
        name: true,
        slug: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!ai?.user.email) return;

    const retryUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ais/${event.aiId}?tab=documents`;

    await this.mailService.sendDocumentFailed(
      ai.user.email,
      event.filename,
      ai.name,
      event.errorMessage,
      retryUrl
    );

    this.logger.log(
      `Sent failure notification for document ${event.documentId} to ${ai.user.email}`
    );

    this.webhooksService
      .emit(ai.user.id, 'document.failed', {
        documentId: event.documentId,
        aiId: event.aiId,
        filename: event.filename,
        errorMessage: event.errorMessage,
      })
      .catch(() => {});
  }

  private async handleDocumentIndexed(event: DocumentProgressEvent): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: event.documentId },
      select: {
        id: true,
        filename: true,
        chunkCount: true,
        ai: {
          select: {
            id: true,
            name: true,
            userId: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    if (!document) return;

    if (document.ai.user.email) {
      const aiSettingsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ais/${document.ai.id}`;
      this.mailService
        .sendDocumentIndexed(
          document.ai.user.email,
          document.filename,
          document.ai.name,
          document.chunkCount ?? 0,
          aiSettingsUrl
        )
        .catch((err) => {
          this.logger.error(`Failed to send indexed notification: ${err}`);
        });
    }

    this.webhooksService
      .emit(document.ai.userId, 'document.indexed', {
        documentId: document.id,
        aiId: document.ai.id,
        filename: document.filename,
      })
      .catch(() => {});
  }
}
