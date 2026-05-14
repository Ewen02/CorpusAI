import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

/**
 * INTERNAL select including `secret` — required to sign HMAC payloads when
 * delivering webhook events. Caller must NOT return this object to the client.
 */
const WEBHOOK_INTERNAL_DELIVERY_SELECT = {
  id: true,
  userId: true,
  url: true,
  secret: true,
  active: true,
  events: true,
} as const;

@Injectable()
export class WebhooksRepository {
  constructor(private readonly db: PrismaService) {}

  async create(userId: string, url: string, events: string[], secret: string) {
    return this.db.client.webhook.create({
      data: { userId, url, events, secret },
      select: { id: true, url: true, events: true, secret: true, active: true, createdAt: true },
    });
  }

  async list(userId: string) {
    return this.db.client.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        lastDeliveredAt: true,
        failureCount: true,
        deliveries: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, eventType: true, statusCode: true, success: true, createdAt: true },
        },
      },
    });
  }

  /**
   * INTERNAL ONLY — returns the webhook secret for HMAC signature generation.
   * The service uses `userId` to verify ownership before delivery.
   */
  async findById(id: string) {
    return this.db.client.webhook.findUnique({
      where: { id },
      select: WEBHOOK_INTERNAL_DELIVERY_SELECT,
    });
  }

  async delete(id: string) {
    return this.db.client.webhook.delete({ where: { id } });
  }

  /**
   * INTERNAL ONLY — returns webhooks (with secret) for HMAC signing during
   * event emission. Caller (WebhooksService.emit) never exposes these objects.
   */
  async findActiveByEvent(userId: string, event: string) {
    return this.db.client.webhook.findMany({
      where: { userId, active: true, events: { has: event } },
      select: WEBHOOK_INTERNAL_DELIVERY_SELECT,
    });
  }

  async createDelivery(
    webhookId: string,
    eventType: string,
    payload: object,
    statusCode: number | null,
    success: boolean,
    attempt: number = 1
  ) {
    return this.db.client.webhookDelivery.create({
      data: { webhookId, eventType, payload, statusCode, success, attempt },
      select: {
        id: true,
        eventType: true,
        statusCode: true,
        success: true,
        attempt: true,
        createdAt: true,
      },
    });
  }

  async markDelivered(webhookId: string) {
    return this.db.client.webhook.update({
      where: { id: webhookId },
      data: { lastDeliveredAt: new Date(), failureCount: 0 },
      select: { id: true, lastDeliveredAt: true, failureCount: true },
    });
  }

  async incrementFailure(webhookId: string) {
    return this.db.client.webhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
      select: { id: true, failureCount: true },
    });
  }

  /**
   * Public-safe webhook view — no `secret`. Used by the debugger UI to render
   * configuration & ownership without ever leaking signing material.
   */
  async findByIdForUser(id: string, userId: string) {
    return this.db.client.webhook.findFirst({
      where: { id, userId },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
        lastDeliveredAt: true,
        failureCount: true,
        userId: true,
      },
    });
  }

  async listDeliveries(webhookId: string, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.db.client.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          eventType: true,
          statusCode: true,
          success: true,
          attempt: true,
          createdAt: true,
        },
      }),
      this.db.client.webhookDelivery.count({ where: { webhookId } }),
    ]);

    return { items, total };
  }

  /**
   * INTERNAL ONLY — returns the original payload sent for a delivery so it can
   * be replayed. Caller (WebhooksService.retryDelivery) must verify ownership
   * via `webhookId`.
   */
  async findDeliveryById(deliveryId: string, webhookId: string) {
    return this.db.client.webhookDelivery.findFirst({
      where: { id: deliveryId, webhookId },
      select: {
        id: true,
        webhookId: true,
        eventType: true,
        payload: true,
        success: true,
        attempt: true,
      },
    });
  }
}
