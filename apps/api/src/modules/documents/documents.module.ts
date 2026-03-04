import { Module, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitter } from 'node:events';
import Redis from 'ioredis';
import { createDocumentQueue, REDIS_CHANNELS } from '@corpusai/queue';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
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
            subscriber.subscribe(REDIS_CHANNELS.DOCUMENT_PROGRESS).catch((err: unknown) => {
              logger.error(`Failed to subscribe to progress channel: ${err}`);
            });
          })
          .catch((err: unknown) => {
            logger.error(`Failed to connect Redis subscriber: ${err}`);
          });

        subscriber.on('message', (_channel: string, message: string) => {
          try {
            const event = JSON.parse(message);
            emitter.emit('progress', event);
          } catch {
            // Ignore malformed messages
          }
        });

        return emitter;
      },
      inject: ['PROGRESS_SUBSCRIBER'],
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule implements OnModuleDestroy {
  constructor(
    @Inject('PROGRESS_SUBSCRIBER') private readonly subscriber: Redis,
    @Inject('PROGRESS_EMITTER') private readonly emitter: EventEmitter
  ) {}

  async onModuleDestroy() {
    await this.subscriber.quit().catch(() => {});
    this.emitter.removeAllListeners();
  }
}
