import { Global, Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '../auth';

@Global()
@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, AuthGuard],
  exports: [WebhooksService],
})
export class WebhooksModule {}
