import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, SubscriptionStatus } from '@corpusai/database';
import { PLAN_PRICING, type SubscriptionPlanType } from '@corpusai/subscription';
import { StripeService } from './stripe.service';
import { BillingRepository } from './billing.repository';
import type Stripe from 'stripe';

/** Map plan + interval to Stripe price env var name */
function stripePriceEnvKey(plan: string, interval: string): string {
  return `STRIPE_PRICE_${plan}_${interval.toUpperCase()}`;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private stripeService: StripeService,
    private config: ConfigService,
    private readonly repo: BillingRepository
  ) {}

  async createCheckoutSession(
    userId: string,
    plan: 'CREATOR' | 'PRO' | 'ENTERPRISE',
    interval: 'monthly' | 'yearly'
  ): Promise<{ url: string }> {
    const stripe = this.stripeService.client;

    const user = await this.repo.findUserForCheckout(userId);

    if (!user) throw new NotFoundException('User not found');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { userId } },
        { idempotencyKey: `create-customer-${userId}` }
      );
      customerId = customer.id;
      await this.repo.updateStripeCustomerId(userId, customerId);
    }

    const priceId = this.config.get<string>(stripePriceEnvKey(plan, interval));
    if (!priceId) {
      throw new BadRequestException(`Price not configured for ${plan} ${interval}`);
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL')!;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/settings/billing?success=true`,
      cancel_url: `${frontendUrl}/settings/billing?canceled=true`,
      metadata: { userId, plan, interval },
    });

    if (!session.url) throw new BadRequestException('Failed to create checkout session');

    return { url: session.url };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const stripe = this.stripeService.client;

    const user = await this.repo.findUserForPortal(userId);

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No billing account found. Subscribe to a plan first.');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL')!;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/settings/billing`,
    });

    return { url: session.url };
  }

  async getInvoices(userId: string) {
    const stripe = this.stripeService.client;

    const user = await this.repo.findUserForInvoices(userId);

    if (!user?.stripeCustomerId) return [];

    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 20,
    });

    return invoices.data.map((inv) => ({
      id: inv.id,
      status: inv.status,
      amount: inv.amount_paid,
      currency: inv.currency,
      date: inv.created ? new Date(inv.created * 1000) : null,
      pdfUrl: inv.invoice_pdf,
    }));
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.syncSubscription(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await this.handlePaymentFailed(invoice.customer as string);
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const user = await this.repo.findUserByStripeCustomer(customerId);

    if (!user) {
      this.logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    const plan = this.resolvePlan(subscription);
    const status = this.mapStripeStatus(subscription.status);

    await this.repo.updateSubscription(user.id, {
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionStart: new Date(subscription.start_date * 1000),
      subscriptionEnd: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : subscription.ended_at
          ? new Date(subscription.ended_at * 1000)
          : null,
    });

    this.logger.log(`Synced subscription for user ${user.id}: ${plan} (${status})`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    await this.repo.revertToFree(customerId);
    this.logger.log(`Subscription deleted for customer ${customerId}, reverted to FREE`);
  }

  private async handlePaymentFailed(customerId: string): Promise<void> {
    await this.repo.markPastDue(customerId);
    this.logger.warn(`Payment failed for customer ${customerId}, status set to PAST_DUE`);
  }

  private resolvePlan(subscription: Stripe.Subscription): SubscriptionPlan {
    const metaPlan = subscription.metadata?.plan?.toUpperCase();
    if (metaPlan && metaPlan in SubscriptionPlan) {
      return metaPlan as SubscriptionPlan;
    }

    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId) {
      for (const plan of ['CREATOR', 'PRO', 'ENTERPRISE'] as const) {
        for (const interval of ['MONTHLY', 'YEARLY']) {
          if (this.config.get<string>(`STRIPE_PRICE_${plan}_${interval}`) === priceId) {
            return plan as SubscriptionPlan;
          }
        }
      }
    }

    this.logger.warn(
      `Could not resolve plan for subscription ${subscription.id}, defaulting to CREATOR`
    );
    return SubscriptionPlan.CREATOR;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }
}
