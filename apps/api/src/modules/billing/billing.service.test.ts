import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  SubscriptionPlan: {
    FREE: 'FREE',
    CREATOR: 'CREATOR',
    PRO: 'PRO',
    ENTERPRISE: 'ENTERPRISE',
  },
  SubscriptionStatus: {
    ACTIVE: 'ACTIVE',
    PAST_DUE: 'PAST_DUE',
    CANCELED: 'CANCELED',
    TRIALING: 'TRIALING',
  },
}));

vi.mock('@corpusai/subscription', () => ({
  PLAN_PRICING: {},
}));

import { prisma } from '@corpusai/database';

const mockUser = prisma.user as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};

describe('BillingService', () => {
  let service: BillingService;

  const mockStripeCustomersCreate = vi.fn();
  const mockStripeCheckoutSessionsCreate = vi.fn();
  const mockStripeBillingPortalSessionsCreate = vi.fn();
  const mockStripeInvoicesList = vi.fn();

  const mockStripeClient = {
    customers: { create: mockStripeCustomersCreate },
    checkout: { sessions: { create: mockStripeCheckoutSessionsCreate } },
    billingPortal: { sessions: { create: mockStripeBillingPortalSessionsCreate } },
    invoices: { list: mockStripeInvoicesList },
  };

  const mockStripeService = {
    get client() {
      return mockStripeClient;
    },
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const configMap: Record<string, string> = {
        FRONTEND_URL: 'https://app.corpusai.io',
        STRIPE_PRICE_CREATOR_MONTHLY: 'price_creator_monthly',
        STRIPE_PRICE_CREATOR_YEARLY: 'price_creator_yearly',
        STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
        STRIPE_PRICE_PRO_YEARLY: 'price_pro_yearly',
      };
      return configMap[key];
    }),
  };

  const mockRepo = {
    findUserForCheckout: vi.fn((...args: unknown[]) =>
      mockUser.findUnique({ where: { id: args[0] } })
    ),
    updateStripeCustomerId: vi.fn((...args: unknown[]) =>
      mockUser.update({ where: { id: args[0] }, data: { stripeCustomerId: args[1] } })
    ),
    findUserForPortal: vi.fn((...args: unknown[]) =>
      mockUser.findUnique({ where: { id: args[0] } })
    ),
    findUserForInvoices: vi.fn((...args: unknown[]) =>
      mockUser.findUnique({ where: { id: args[0] } })
    ),
    findUserByStripeCustomer: vi.fn((...args: unknown[]) =>
      mockUser.findFirst({ where: { stripeCustomerId: args[0] } })
    ),
    updateSubscription: vi.fn((...args: unknown[]) =>
      mockUser.update({ where: { id: args[0] }, data: args[1] })
    ),
    revertToFree: vi.fn((...args: unknown[]) =>
      mockUser.updateMany({ where: { stripeCustomerId: args[0] } })
    ),
    markPastDue: vi.fn((...args: unknown[]) =>
      mockUser.updateMany({ where: { stripeCustomerId: args[0] } })
    ),
  };

  beforeEach(() => {
    service = new BillingService(
      mockStripeService as any,
      mockConfigService as any,
      mockRepo as any
    );
    vi.clearAllMocks();
    // Re-apply config mock after clearAllMocks
    mockConfigService.get.mockImplementation((key: string) => {
      const configMap: Record<string, string> = {
        FRONTEND_URL: 'https://app.corpusai.io',
        STRIPE_PRICE_CREATOR_MONTHLY: 'price_creator_monthly',
        STRIPE_PRICE_CREATOR_YEARLY: 'price_creator_yearly',
        STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly',
        STRIPE_PRICE_PRO_YEARLY: 'price_pro_yearly',
      };
      return configMap[key];
    });
  });

  describe('createCheckoutSession', () => {
    it('should create session with correct plan', async () => {
      mockUser.findUnique.mockResolvedValue({
        email: 'user@test.com',
        stripeCustomerId: 'cus_existing',
      });
      mockStripeCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
      });

      const result = await service.createCheckoutSession('user-1', 'CREATOR', 'monthly');

      expect(result).toEqual({ url: 'https://checkout.stripe.com/session_123' });
      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
          mode: 'subscription',
          line_items: [{ price: 'price_creator_monthly', quantity: 1 }],
          success_url: 'https://app.corpusai.io/settings/billing?success=true',
          cancel_url: 'https://app.corpusai.io/settings/billing?canceled=true',
          metadata: { userId: 'user-1', plan: 'CREATOR', interval: 'monthly' },
        })
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(service.createCheckoutSession('missing', 'PRO', 'monthly')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should create Stripe customer if user has none', async () => {
      mockUser.findUnique.mockResolvedValue({
        email: 'new@test.com',
        stripeCustomerId: null,
      });
      mockStripeCustomersCreate.mockResolvedValue({ id: 'cus_new' });
      mockUser.update.mockResolvedValue({});
      mockStripeCheckoutSessionsCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_456',
      });

      const result = await service.createCheckoutSession('user-2', 'PRO', 'yearly');

      expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
        { email: 'new@test.com', metadata: { userId: 'user-2' } },
        { idempotencyKey: 'create-customer-user-2' }
      );
      expect(mockUser.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { stripeCustomerId: 'cus_new' },
      });
      expect(result).toEqual({ url: 'https://checkout.stripe.com/session_456' });
    });

    it('should throw BadRequestException if price not configured', async () => {
      mockUser.findUnique.mockResolvedValue({
        email: 'user@test.com',
        stripeCustomerId: 'cus_existing',
      });
      // ENTERPRISE prices are not in our configMap
      await expect(
        service.createCheckoutSession('user-1', 'ENTERPRISE', 'monthly')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPortalSession', () => {
    it('should return portal URL', async () => {
      mockUser.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_123' });
      mockStripeBillingPortalSessionsCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/portal_123',
      });

      const result = await service.createPortalSession('user-1');

      expect(result).toEqual({ url: 'https://billing.stripe.com/portal_123' });
      expect(mockStripeBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.corpusai.io/settings/billing',
      });
    });

    it('should throw BadRequestException if user has no Stripe customer', async () => {
      mockUser.findUnique.mockResolvedValue({ stripeCustomerId: null });

      await expect(service.createPortalSession('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvoices', () => {
    it('should return formatted invoices', async () => {
      mockUser.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_123' });
      mockStripeInvoicesList.mockResolvedValue({
        data: [
          {
            id: 'inv_1',
            status: 'paid',
            amount_paid: 2900,
            currency: 'eur',
            created: 1700000000,
            invoice_pdf: 'https://stripe.com/invoice.pdf',
          },
        ],
      });

      const result = await service.getInvoices('user-1');

      expect(result).toEqual([
        {
          id: 'inv_1',
          status: 'paid',
          amount: 2900,
          currency: 'eur',
          date: new Date(1700000000 * 1000),
          pdfUrl: 'https://stripe.com/invoice.pdf',
        },
      ]);
    });

    it('should return empty array for user without Stripe customer', async () => {
      mockUser.findUnique.mockResolvedValue({ stripeCustomerId: null });

      const result = await service.getInvoices('user-1');

      expect(result).toEqual([]);
      expect(mockStripeInvoicesList).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhookEvent', () => {
    it('should sync subscription on customer.subscription.updated', async () => {
      mockUser.findFirst.mockResolvedValue({ id: 'user-1' });
      mockUser.update.mockResolvedValue({});

      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            start_date: 1700000000,
            cancel_at: null,
            ended_at: null,
            metadata: { plan: 'PRO' },
            items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(mockUser.findFirst).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
      });
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            subscriptionPlan: 'PRO',
            subscriptionStatus: 'ACTIVE',
          }),
        })
      );
    });

    it('should handle subscription deletion', async () => {
      mockRepo.revertToFree.mockResolvedValue({ count: 1 });

      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_456',
            status: 'canceled',
            metadata: {},
            items: { data: [] },
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(mockRepo.revertToFree).toHaveBeenCalledWith('cus_456');
    });

    it('should handle invoice.payment_failed', async () => {
      mockRepo.markPastDue.mockResolvedValue({ count: 1 });

      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_789',
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(mockRepo.markPastDue).toHaveBeenCalledWith('cus_789');
    });

    it('should not throw for unhandled event types', async () => {
      const event = {
        type: 'some.unknown.event',
        data: { object: {} },
      };

      await expect(service.handleWebhookEvent(event as any)).resolves.toBeUndefined();
    });
  });
});
