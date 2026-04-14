import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { AIsModule } from './modules/ais';
import { DocumentsModule } from './modules/documents';
import { ConversationsModule } from './modules/conversations';
import { RagModule } from './modules/rag';
import { HealthModule } from './modules/health';
import { BillingModule } from './modules/billing';
import { AdminModule } from './modules/admin';
import { PublicApiModule } from './modules/public-api';
import { ExploreModule } from './modules/explore';
import { MailInfrastructureModule } from './infrastructure/mail';
import { EndUserAuthModule } from './modules/end-user-auth';
import { PortalModule } from './modules/portal';
import { WebhooksModule } from './modules/webhooks';
import { DatabaseModule } from './infrastructure/database';
import { LLMModule } from './infrastructure/llm';
import { QueueModule } from './infrastructure/queue';
import { SharedModule } from './shared/shared.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CORRELATION_ID_HEADER } from './common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        BETTER_AUTH_SECRET: Joi.string().min(32).required(),
        BETTER_AUTH_URL: Joi.string().uri().required(),
        FRONTEND_URL: Joi.string().uri().required(),
        OPENAI_API_KEY: Joi.string().required(),
        QDRANT_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().optional().allow(''),
        STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
        STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),
        MISTRAL_API_KEY: Joi.string().optional().allow(''),
        SENTRY_DSN: Joi.string().optional().allow(''),
        RESEND_API_KEY: Joi.string().optional().allow(''),
        RESEND_FROM_EMAIL: Joi.string().optional().allow(''),
        API_KEY_RATE_LIMIT: Joi.number().default(60),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
      }),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          autoLogging: config.get('NODE_ENV') === 'production',
          customProps: (req: { headers?: Record<string, string | string[] | undefined> }) => ({
            correlationId: req.headers?.[CORRELATION_ID_HEADER],
          }),
          ...(config.get('NODE_ENV') !== 'production'
            ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
            : {}),
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    LLMModule,
    MailInfrastructureModule,
    QueueModule,
    SharedModule,
    AuthModule,
    UsersModule,
    AIsModule,
    DocumentsModule,
    ConversationsModule,
    RagModule,
    HealthModule,
    BillingModule,
    AdminModule,
    PublicApiModule,
    ExploreModule,
    EndUserAuthModule,
    PortalModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
