import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

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

  async findById(id: string) {
    return this.db.client.webhook.findUnique({ where: { id } });
  }

  async delete(id: string) {
    return this.db.client.webhook.delete({ where: { id } });
  }

  async findActiveByEvent(userId: string, event: string) {
    return this.db.client.webhook.findMany({
      where: { userId, active: true, events: { has: event } },
    });
  }

  async createDelivery(
    webhookId: string,
    eventType: string,
    payload: object,
    statusCode: number | null,
    success: boolean
  ) {
    return this.db.client.webhookDelivery.create({
      data: { webhookId, eventType, payload, statusCode, success },
    });
  }

  async markDelivered(webhookId: string) {
    return this.db.client.webhook.update({
      where: { id: webhookId },
      data: { lastDeliveredAt: new Date(), failureCount: 0 },
    });
  }

  async incrementFailure(webhookId: string) {
    return this.db.client.webhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
    });
  }
}
