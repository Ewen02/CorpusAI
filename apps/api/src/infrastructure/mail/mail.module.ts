import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MAIL_SERVICE } from './mail.port';
import { ResendMailAdapter } from './resend.adapter';
import { ResendWebhookController } from './resend-webhook.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [ResendWebhookController],
  providers: [
    {
      provide: MAIL_SERVICE,
      useClass: ResendMailAdapter,
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailInfrastructureModule {}
