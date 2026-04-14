import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type Redis from 'ioredis';
import { REDIS_CHANNELS } from '@corpusai/queue';
import type { IEventBus } from './event-bus.port';

export const EVENT_BUS_SUBSCRIBER = 'EVENT_BUS_SUBSCRIBER';

@Injectable()
export class RedisEventBusAdapter implements IEventBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisEventBusAdapter.name);
  private readonly emitter = new EventEmitter();

  constructor(@Optional() @Inject(EVENT_BUS_SUBSCRIBER) private readonly subscriber: Redis | null) {
    this.emitter.setMaxListeners(100);
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }

  async onModuleInit() {
    if (!this.subscriber) return;

    try {
      await this.subscriber.connect();
      await this.subscriber.subscribe(
        REDIS_CHANNELS.DOCUMENT_PROGRESS,
        REDIS_CHANNELS.DOCUMENT_FINAL_FAILURE
      );

      this.subscriber.on('message', (channel: string, message: string) => {
        try {
          const event = JSON.parse(message);
          if (channel === REDIS_CHANNELS.DOCUMENT_PROGRESS) {
            this.emitter.emit('progress', event);
          } else if (channel === REDIS_CHANNELS.DOCUMENT_FINAL_FAILURE) {
            this.emitter.emit('final-failure', event);
          }
        } catch {
          // Ignore malformed messages
        }
      });
    } catch (err) {
      this.logger.error(`Failed to initialize event bus subscriber: ${err}`);
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit().catch(() => {});
    }
    this.emitter.removeAllListeners();
  }
}
