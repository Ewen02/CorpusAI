import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { prisma } from '@corpusai/database';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // ── Create ──

  async create(userId: string, dto: { url: string; events: string[] }) {
    const secret = crypto.randomBytes(32).toString('hex');

    return prisma.webhook.create({
      data: {
        userId,
        url: dto.url,
        events: dto.events,
        secret,
      },
      select: {
        id: true,
        url: true,
        events: true,
        secret: true,
        active: true,
        createdAt: true,
      },
    });
  }

  // ── List ──

  async list(userId: string) {
    return prisma.webhook.findMany({
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
          select: {
            id: true,
            eventType: true,
            statusCode: true,
            success: true,
            createdAt: true,
          },
        },
      },
    });
  }

  // ── Delete ──

  async delete(userId: string, id: string) {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    await prisma.webhook.delete({ where: { id } });
  }

  // ── Test ──

  async test(userId: string, id: string) {
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    const payload = { message: 'This is a test webhook delivery' };
    await this.deliver(webhook, 'ping', payload);

    return { success: true };
  }

  // ── Emit (fire-and-forget to all matching webhooks) ──

  async emit(userId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        active: true,
        events: { has: event },
      },
    });

    for (const webhook of webhooks) {
      this.deliver(webhook, event, payload).catch((err) => {
        this.logger.error(`Failed to deliver webhook ${webhook.id}: ${err.message}`);
      });
    }
  }

  // ── Deliver ──

  async deliver(
    webhook: { id: string; url: string; secret: string },
    eventType: string,
    payload: Record<string, unknown>
  ) {
    const body = JSON.stringify({
      event: eventType,
      data: payload,
      timestamp: new Date().toISOString(),
    });

    const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

    let statusCode: number | null = null;
    let success = false;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-event': eventType,
          'x-webhook-signature': signature,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      statusCode = response.status;
      success = response.ok;
    } catch (err) {
      this.logger.warn(`Webhook delivery failed for ${webhook.id}: ${(err as Error).message}`);
    }

    // Log the delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        eventType,
        payload: payload as object,
        statusCode,
        success,
      },
    });

    // Update webhook status
    if (success) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastDeliveredAt: new Date(),
          failureCount: 0,
        },
      });
    } else {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: { increment: 1 },
        },
      });
    }
  }
}
