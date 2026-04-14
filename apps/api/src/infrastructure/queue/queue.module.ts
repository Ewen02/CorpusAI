import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDocumentQueue } from '@corpusai/queue';
import { DOCUMENT_QUEUE_PORT } from './queue.port';
import { BULLMQ_DOCUMENT_QUEUE, BullMQDocumentQueueAdapter } from './bullmq.adapter';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BULLMQ_DOCUMENT_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is required for document processing queue');
        }
        return createDocumentQueue(redisUrl);
      },
      inject: [ConfigService],
    },
    {
      provide: DOCUMENT_QUEUE_PORT,
      useClass: BullMQDocumentQueueAdapter,
    },
  ],
  exports: [DOCUMENT_QUEUE_PORT, BULLMQ_DOCUMENT_QUEUE],
})
export class QueueModule {}
