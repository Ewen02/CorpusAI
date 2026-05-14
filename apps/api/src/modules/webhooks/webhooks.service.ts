import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { WebhooksRepository } from './webhooks.repository';

/**
 * Sample payloads sent when the user triggers a test delivery from the
 * debugger UI. Mirrors the shape emitted by the real producers so integration
 * targets can validate their handlers without waiting for a real event.
 */
const SAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
  'document.indexed': {
    documentId: 'doc_sample_indexed',
    aiId: 'ai_sample',
    title: 'Sample document.pdf',
    chunksCreated: 42,
    sample: true,
  },
  'document.failed': {
    documentId: 'doc_sample_failed',
    aiId: 'ai_sample',
    title: 'Broken document.pdf',
    error: 'Sample error: parsing failed',
    sample: true,
  },
  'conversation.started': {
    conversationId: 'conv_sample',
    aiId: 'ai_sample',
    source: 'CHAT',
    sample: true,
  },
  ping: { message: 'This is a test webhook delivery' },
};

export interface DeliveryResult {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  error?: string;
}

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

  async getById(userId: string, id: string) {
    const webhook = await this.repo.findByIdForUser(id, userId);
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  async delete(userId: string, id: string) {
    const webhook = await this.repo.findById(id);
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    await this.repo.delete(id);
  }

  async test(userId: string, id: string, eventType: string = 'ping'): Promise<DeliveryResult> {
    const webhook = await this.repo.findById(id);
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    const payload = SAMPLE_PAYLOADS[eventType] ?? SAMPLE_PAYLOADS.ping ?? { message: 'test' };
    return this.deliver(webhook, eventType, payload);
  }

  async listDeliveries(userId: string, id: string, skip: number, take: number) {
    const webhook = await this.repo.findByIdForUser(id, userId);
    if (!webhook) throw new NotFoundException('Webhook not found');
    return this.repo.listDeliveries(id, skip, take);
  }

  async retryDelivery(
    userId: string,
    webhookId: string,
    deliveryId: string
  ): Promise<DeliveryResult> {
    const webhook = await this.repo.findById(webhookId);
    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.userId !== userId) throw new ForbiddenException('Access denied');

    const delivery = await this.repo.findDeliveryById(deliveryId, webhookId);
    if (!delivery) throw new NotFoundException('Delivery not found');

    const payload = (delivery.payload ?? {}) as Record<string, unknown>;
    return this.deliver(webhook, delivery.eventType, payload, delivery.attempt + 1);
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
    payload: Record<string, unknown>,
    attempt: number = 1
  ): Promise<DeliveryResult> {
    const body = JSON.stringify({
      event: eventType,
      data: payload,
      timestamp: new Date().toISOString(),
    });

    const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

    let statusCode: number | null = null;
    let success = false;
    let error: string | undefined;
    const startedAt = Date.now();

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
      error = (err as Error).message;
      this.logger.warn(`Webhook delivery failed for ${webhook.id}: ${error}`);
    }

    const latencyMs = Date.now() - startedAt;

    await this.repo.createDelivery(
      webhook.id,
      eventType,
      payload as object,
      statusCode,
      success,
      attempt
    );

    if (success) {
      await this.repo.markDelivered(webhook.id);
    } else {
      await this.repo.incrementFailure(webhook.id);
    }

    return { success, statusCode, latencyMs, error };
  }
}
