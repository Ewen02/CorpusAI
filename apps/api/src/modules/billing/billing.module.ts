import { Module } from '@nestjs/common';
import { BillingController, WebhookController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { StripeService } from './stripe.service';
import { AuthGuard } from '../auth';

@Module({
  controllers: [BillingController, WebhookController],
  providers: [BillingService, BillingRepository, StripeService, AuthGuard],
  exports: [BillingService, StripeService],
})
export class BillingModule {}
