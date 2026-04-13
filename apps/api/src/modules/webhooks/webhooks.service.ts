import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { WebhooksRepository } from './webhooks.repository';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly repo: WebhooksRepository) {}

  async create(userId: string, dto: { url: string; events: string[] }) {
    const secret = crypto.randomBytes(32).toString('hex');
    return this.repo.create(userId, dto.url, dto.events, secret);
  }

  async list(userId: string) {
    return this.repo.list(userId);
  }

  async delete(userId: string, id: string) {
    const webhook = await this.repo.findById(id);
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    await this.repo.delete(id);
  }

  async test(userId: string, id: string) {
    const webhook = await this.repo.findById(id);
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    const payload = { message: 'This is a test webhook delivery' };
    await this.deliver(webhook, 'ping', payload);

    return { success: true };
  }

  async emit(userId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await this.repo.findActiveByEvent(userId, event);

    for (const webhook of webhooks) {
      this.deliver(webhook, event, payload).catch((err) => {
        this.logger.error(`Failed to deliver webhook ${webhook.id}: ${err.message}`);
      });
    }
  }

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

    await this.repo.createDelivery(webhook.id, eventType, payload as object, statusCode, success);

    if (success) {
      await this.repo.markDelivered(webhook.id);
    } else {
      await this.repo.incrementFailure(webhook.id);
    }
  }
}
