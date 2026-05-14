import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

const ORIGINAL_FETCH = globalThis.fetch;

describe('WebhooksService', () => {
  let service: WebhooksService;
  const mockRepo = {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    findByIdForUser: vi.fn(),
    delete: vi.fn(),
    findActiveByEvent: vi.fn(),
    createDelivery: vi.fn(),
    markDelivered: vi.fn(),
    incrementFailure: vi.fn(),
    listDeliveries: vi.fn(),
    findDeliveryById: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhooksService(mockRepo as never);
    mockRepo.createDelivery.mockResolvedValue({ id: 'del-1' });
    mockRepo.markDelivered.mockResolvedValue({});
    mockRepo.incrementFailure.mockResolvedValue({});
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  describe('getById', () => {
    it('returns the webhook for the owning user', async () => {
      const wh = { id: 'wh-1', userId: 'user-1', url: 'https://x.test', events: ['ping'] };
      mockRepo.findByIdForUser.mockResolvedValue(wh);

      const result = await service.getById('user-1', 'wh-1');

      expect(result).toBe(wh);
      expect(mockRepo.findByIdForUser).toHaveBeenCalledWith('wh-1', 'user-1');
    });

    it('throws NotFoundException when the webhook is missing or owned by another user', async () => {
      mockRepo.findByIdForUser.mockResolvedValue(null);
      await expect(service.getById('user-1', 'wh-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('test', () => {
    it('delivers a sample payload for document.indexed and persists the result', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'wh-1',
        userId: 'user-1',
        url: 'https://x.test',
        secret: 'secret',
      });
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true } as Response) as never;

      const result = await service.test('user-1', 'wh-1', 'document.indexed');

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(typeof result.latencyMs).toBe('number');

      expect(globalThis.fetch).toHaveBeenCalledOnce();
      const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call).toBeDefined();
      const init = call![1] as { headers: Record<string, string>; body: string };
      expect(init.headers['x-webhook-event']).toBe('document.indexed');
      const body = JSON.parse(init.body) as { event: string; data: { sample: boolean } };
      expect(body.event).toBe('document.indexed');
      expect(body.data.sample).toBe(true);

      expect(mockRepo.createDelivery).toHaveBeenCalledWith(
        'wh-1',
        'document.indexed',
        expect.objectContaining({ sample: true }),
        200,
        true,
        1
      );
      expect(mockRepo.markDelivered).toHaveBeenCalledWith('wh-1');
    });

    it('throws ForbiddenException when the webhook belongs to another user', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'wh-1',
        userId: 'other',
        url: 'https://x.test',
        secret: 's',
      });

      await expect(service.test('user-1', 'wh-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listDeliveries', () => {
    it('returns paginated deliveries for the owning user', async () => {
      mockRepo.findByIdForUser.mockResolvedValue({ id: 'wh-1', userId: 'user-1' });
      mockRepo.listDeliveries.mockResolvedValue({ items: [{ id: 'del-1' }], total: 1 });

      const result = await service.listDeliveries('user-1', 'wh-1', 0, 20);

      expect(result.total).toBe(1);
      expect(mockRepo.listDeliveries).toHaveBeenCalledWith('wh-1', 0, 20);
    });

    it('throws NotFoundException when the webhook is not owned', async () => {
      mockRepo.findByIdForUser.mockResolvedValue(null);
      await expect(service.listDeliveries('user-1', 'wh-1', 0, 20)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('retryDelivery', () => {
    it('replays the stored payload and increments the attempt counter', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'wh-1',
        userId: 'user-1',
        url: 'https://x.test',
        secret: 'secret',
      });
      mockRepo.findDeliveryById.mockResolvedValue({
        id: 'del-1',
        webhookId: 'wh-1',
        eventType: 'document.indexed',
        payload: { documentId: 'doc-1' },
        success: false,
        attempt: 1,
      });
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 500, ok: false } as Response) as never;

      const result = await service.retryDelivery('user-1', 'wh-1', 'del-1');

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(mockRepo.createDelivery).toHaveBeenCalledWith(
        'wh-1',
        'document.indexed',
        { documentId: 'doc-1' },
        500,
        false,
        2 // attempt incremented
      );
      expect(mockRepo.incrementFailure).toHaveBeenCalledWith('wh-1');
    });

    it('throws NotFoundException when the delivery does not exist', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'wh-1',
        userId: 'user-1',
        url: 'https://x.test',
        secret: 's',
      });
      mockRepo.findDeliveryById.mockResolvedValue(null);

      await expect(service.retryDelivery('user-1', 'wh-1', 'del-missing')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
