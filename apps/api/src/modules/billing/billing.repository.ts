import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { SubscriptionPlan, SubscriptionStatus } from '@corpusai/database';

/** Minimal fields needed to identify a user by their Stripe customer (avoid loading hashedPassword/email tokens). */
const USER_BY_STRIPE_SELECT = {
  id: true,
  email: true,
  stripeCustomerId: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
} as const;

@Injectable()
export class BillingRepository {
  constructor(private readonly db: PrismaService) {}

  async findUserForCheckout(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });
  }

  async updateStripeCustomerId(userId: string, customerId: string) {
    return this.db.client.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
      select: { id: true, stripeCustomerId: true },
    });
  }

  async findUserForPortal(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
  }

  async findUserForInvoices(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
  }

  async findUserByStripeCustomer(customerId: string) {
    return this.db.client.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: USER_BY_STRIPE_SELECT,
    });
  }

  async updateSubscription(
    userId: string,
    data: {
      subscriptionPlan: SubscriptionPlan;
      subscriptionStatus: SubscriptionStatus;
      subscriptionStart: Date;
      subscriptionEnd: Date | null;
    }
  ) {
    return this.db.client.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      },
    });
  }

  async revertToFree(customerId: string) {
    return this.db.client.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.CANCELED,
        subscriptionEnd: new Date(),
      },
    });
  }

  async markPastDue(customerId: string) {
    return this.db.client.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: { subscriptionStatus: SubscriptionStatus.PAST_DUE },
    });
  }
}
