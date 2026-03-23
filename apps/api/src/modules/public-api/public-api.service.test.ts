import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PublicApiService } from './public-api.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    apiKey: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    aI: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue(Buffer.from('a'.repeat(24))),
    createHash: actual.createHash,
  };
});

import { prisma } from '@corpusai/database';

const mockApiKey = prisma.apiKey as unknown as {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const mockAI = prisma.aI as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};

describe('PublicApiService', () => {
  let service: PublicApiService;
  const mockRagService = { query: vi.fn() };

  beforeEach(() => {
    service = new PublicApiService(mockRagService as any);
    vi.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create and return an API key starting with cai_', async () => {
      mockApiKey.create.mockResolvedValue({});

      const result = await service.createApiKey('user-1', 'My Key');

      expect(result.key).toMatch(/^cai_/);
      expect(result.name).toBe('My Key');
      expect(mockApiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            name: 'My Key',
          }),
        })
      );
    });

    it('should not store the raw key (only hash)', async () => {
      mockApiKey.create.mockResolvedValue({});

      const result = await service.createApiKey('user-1', 'My Key');

      const createCall = mockApiKey.create.mock.calls[0]?.[0] as {
        data: { userId: string; name: string; keyHash: string };
      };
      expect(createCall.data.keyHash).toBeDefined();
      expect(createCall.data.keyHash).not.toBe(result.key);
    });
  });

  describe('listApiKeys', () => {
    it('should return API keys for the user', async () => {
      const keys = [{ id: 'key-1', name: 'Test', prefix: 'cai_aaaaaa' }];
      mockApiKey.findMany.mockResolvedValue(keys);

      const result = await service.listApiKeys('user-1');

      expect(result).toBe(keys);
      expect(mockApiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an existing API key', async () => {
      mockApiKey.findFirst.mockResolvedValue({ id: 'key-1', userId: 'user-1' });
      mockApiKey.delete.mockResolvedValue({});

      await service.deleteApiKey('user-1', 'key-1');

      expect(mockApiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
    });

    it('should throw NotFoundException if key does not belong to user', async () => {
      mockApiKey.findFirst.mockResolvedValue(null);

      await expect(service.deleteApiKey('user-1', 'key-unknown')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('query', () => {
    it('should query RAG pipeline for an active AI', async () => {
      const ai = { id: 'ai-1', name: 'Test AI', slug: 'test' };
      mockAI.findFirst.mockResolvedValue(ai);
      mockRagService.query.mockResolvedValue({
        answer: 'The answer',
        sources: [{ chunkId: 'c1', documentSource: 'doc.pdf', score: 0.9, text: 'Excerpt' }],
        metrics: { totalMs: 100 },
      });

      const result = await service.query('user-1', 'test', 'What is this?');

      expect(result.answer).toBe('The answer');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0]).toMatchObject({ chunkId: 'c1', documentSource: 'doc.pdf' });
    });

    it('should throw NotFoundException if AI not found or not active', async () => {
      mockAI.findFirst.mockResolvedValue(null);

      await expect(service.query('user-1', 'missing-ai', 'question')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listUserAIs', () => {
    it('should return active AIs for a user', async () => {
      const ais = [{ id: 'ai-1', slug: 'test', name: 'Test', documentCount: 3 }];
      mockAI.findMany.mockResolvedValue(ais);

      const result = await service.listUserAIs('user-1');

      expect(result).toBe(ais);
      expect(mockAI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: 'ACTIVE' },
        })
      );
    });
  });
});
