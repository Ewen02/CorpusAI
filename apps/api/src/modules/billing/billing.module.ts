import { Module } from '@nestjs/common';
import { BillingController, WebhookController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { StripeService } from './stripe.service';

@Module({
  controllers: [BillingController, WebhookController],
  providers: [BillingService, BillingRepository, StripeService],
  exports: [BillingService, StripeService],
})
export class BillingModule {}
