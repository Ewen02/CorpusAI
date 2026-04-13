import { Global, Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksRepository } from './webhooks.repository';
import { AuthGuard } from '../auth';

@Global()
@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksRepository, AuthGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
