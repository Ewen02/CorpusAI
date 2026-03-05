import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  RawBodyRequest,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private billingService: BillingService,
    private stripeService: StripeService
  ) {}

  @Post('checkout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout session' })
  async createCheckout(@CurrentUser('id') userId: string, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession(userId, dto.plan, dto.interval);
  }

  @Get('portal')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe Customer Portal URL' })
  async getPortal(@CurrentUser('id') userId: string) {
    return this.billingService.createPortalSession(userId);
  }

  @Get('invoices')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user invoices' })
  async getInvoices(@CurrentUser('id') userId: string) {
    return this.billingService.getInvoices(userId);
  }
}

/**
 * Webhook controller — separate to skip auth and use raw body.
 */
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private billingService: BillingService,
    private stripeService: StripeService
  ) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response
  ) {
    if (!this.stripeService.isConfigured) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: 'Missing raw body' });
    }

    try {
      const event = this.stripeService.client.webhooks.constructEvent(
        rawBody,
        signature,
        this.stripeService.webhookSecret
      );

      await this.billingService.handleWebhookEvent(event);
      return res.json({ received: true });
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }
  }
}
