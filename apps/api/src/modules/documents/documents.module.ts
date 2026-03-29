import { Module, Inject, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import Redis from 'ioredis';
import { prisma } from '@corpusai/database';
import {
  createDocumentQueue,
  REDIS_CHANNELS,
  type DocumentFinalFailureEvent,
  type DocumentProgressEvent,
} from '@corpusai/queue';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MailService } from '../mail/mail.service';
import { WebhooksService } from '../webhooks';
import { RagModule } from '../rag';

@Module({
  imports: [RagModule, ConfigModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: 'DOCUMENT_QUEUE',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is required for document processing queue');
        }
        return createDocumentQueue(redisUrl);
      },
      inject: [ConfigService],
    },
    {
      provide: 'REDIS_URL',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is required for SSE progress streaming');
        }
        return redisUrl;
      },
      inject: [ConfigService],
    },
    {
      provide: 'PROGRESS_SUBSCRIBER',
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is required for progress events');
        }
        const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
        return subscriber;
      },
      inject: [ConfigService],
    },
    {
      provide: 'PROGRESS_EMITTER',
      useFactory: (subscriber: Redis) => {
        const logger = new Logger('ProgressEmitter');
        const emitter = new EventEmitter();
        emitter.setMaxListeners(100);

        subscriber
          .connect()
          .then(() => {
            subscriber
              .subscribe(REDIS_CHANNELS.DOCUMENT_PROGRESS, REDIS_CHANNELS.DOCUMENT_FINAL_FAILURE)
              .catch((err: unknown) => {
                logger.error(`Failed to subscribe to channels: ${err}`);
              });
          })
          .catch((err: unknown) => {
            logger.error(`Failed to connect Redis subscriber: ${err}`);
          });

        subscriber.on('message', (channel: string, message: string) => {
          try {
            const event = JSON.parse(message);
            if (channel === REDIS_CHANNELS.DOCUMENT_PROGRESS) {
              emitter.emit('progress', event);
            } else if (channel === REDIS_CHANNELS.DOCUMENT_FINAL_FAILURE) {
              emitter.emit('final-failure', event);
            }
          } catch {
            // Ignore malformed messages
          }
        });

        return emitter;
      },
      inject: ['PROGRESS_SUBSCRIBER'],
    },
  ],
  exports: [DocumentsService, 'DOCUMENT_QUEUE'],
})
export class DocumentsModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DocumentsModule');

  constructor(
    @Inject('PROGRESS_SUBSCRIBER') private readonly subscriber: Redis,
    @Inject('PROGRESS_EMITTER') private readonly emitter: EventEmitter,
    private readonly mailService: MailService,
    private readonly webhooksService: WebhooksService
  ) {}

  onModuleInit() {
    this.emitter.on('final-failure', (event: DocumentFinalFailureEvent) => {
      this.handleFinalFailure(event).catch((err) => {
        this.logger.error(`Failed to handle final failure event: ${err}`);
      });
    });

    this.emitter.on('progress', (event: DocumentProgressEvent) => {
      if (event.status === 'INDEXED') {
        this.handleDocumentIndexed(event).catch((err) => {
          this.logger.error(`Failed to handle document indexed event: ${err}`);
        });
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit().catch(() => {});
    this.emitter.removeAllListeners();
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
        ai: {
          select: { id: true, userId: true },
        },
      },
    });

    if (!document) return;

    this.webhooksService
      .emit(document.ai.userId, 'document.indexed', {
        documentId: document.id,
        aiId: document.ai.id,
        filename: document.filename,
      })
      .catch(() => {});
  }
}
