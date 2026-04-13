import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { SubscriptionPlan, SubscriptionStatus } from '@corpusai/database';

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
