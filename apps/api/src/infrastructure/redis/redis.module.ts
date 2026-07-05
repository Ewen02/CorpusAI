import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { parseRedisUrl } from '@corpusai/queue';
import { RATE_LIMITER } from './rate-limiter.port';
import { RATE_LIMIT_REDIS, RedisRateLimiterAdapter } from './redis-rate-limiter.adapter';
import { EVENT_BUS } from './event-bus.port';
import { EVENT_BUS_SUBSCRIBER, RedisEventBusAdapter } from './redis-event-bus.adapter';

const logger = new Logger('RedisModule');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RATE_LIMIT_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return null;
        const client = new Redis({
          ...parseRedisUrl(redisUrl),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
        // Without an error listener, an ioredis connection error is an
        // "unhandled error event" that can crash the process.
        client.on('error', (err) => logger.warn(`rate-limit Redis error: ${err.message}`));
        return client;
      },
    },
    {
      provide: EVENT_BUS_SUBSCRIBER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return null;
        const client = new Redis({
          ...parseRedisUrl(redisUrl),
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
        client.on('error', (err) => logger.warn(`event-bus Redis error: ${err.message}`));
        return client;
      },
    },
    {
      provide: RATE_LIMITER,
      useClass: RedisRateLimiterAdapter,
    },
    {
      provide: EVENT_BUS,
      useClass: RedisEventBusAdapter,
    },
  ],
  exports: [RATE_LIMITER, EVENT_BUS],
})
export class RedisModule {}
