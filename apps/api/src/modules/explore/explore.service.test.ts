import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ExploreService } from './explore.service';
import { ExploreSort } from './dto/explore-query.dto';

vi.mock('@corpusai/database', () => ({
  prisma: {
    aI: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  AIStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT', ARCHIVED: 'ARCHIVED' },
  AICategory: {
    SUPPORT: 'SUPPORT',
    EDUCATION: 'EDUCATION',
    LEGAL: 'LEGAL',
    FINANCE: 'FINANCE',
    HEALTH: 'HEALTH',
    TECH: 'TECH',
    OTHER: 'OTHER',
  },
}));

import { prisma } from '@corpusai/database';

const mockAI = prisma.aI as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};
const mockUser = prisma.user as unknown as { findUnique: ReturnType<typeof vi.fn> };

describe('ExploreService', () => {
  let service: ExploreService;

  beforeEach(() => {
    service = new ExploreService();
    vi.clearAllMocks();
  });

  describe('findPublicAIs', () => {
    it('should return paginated results with meta', async () => {
      const ais = [
        { id: 'ai-1', name: 'Bot A', slug: 'bot-a' },
        { id: 'ai-2', name: 'Bot B', slug: 'bot-b' },
      ];
      mockAI.findMany.mockResolvedValue(ais);
      mockAI.count.mockResolvedValue(2);

      const result = await service.findPublicAIs({ page: 1, limit: 24 });

      expect(result.data).toBe(ais);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 24,
        totalPages: 1,
      });
      expect(mockAI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true, status: 'ACTIVE', deletedAt: null }),
          skip: 0,
          take: 24,
        })
      );
    });

    it('should filter by category', async () => {
      mockAI.findMany.mockResolvedValue([]);
      mockAI.count.mockResolvedValue(0);

      await service.findPublicAIs({ category: 'EDUCATION' as any, page: 1, limit: 24 });

      expect(mockAI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'EDUCATION' }),
        })
      );
    });

    it('should search by name/description', async () => {
      mockAI.findMany.mockResolvedValue([]);
      mockAI.count.mockResolvedValue(0);

      await service.findPublicAIs({ search: 'legal', page: 1, limit: 24 });

      expect(mockAI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'legal', mode: 'insensitive' } },
              { description: { contains: 'legal', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('findFeaturedAIs', () => {
    it('should return top 6 by conversation count', async () => {
      const featured = [
        { id: 'ai-1', conversationCount: 100 },
        { id: 'ai-2', conversationCount: 80 },
      ];
      mockAI.findMany.mockResolvedValue(featured);

      const result = await service.findFeaturedAIs();

      expect(result).toBe(featured);
      expect(mockAI.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true, status: 'ACTIVE', deletedAt: null }),
          orderBy: { conversationCount: 'desc' },
          take: 6,
        })
      );
    });
  });

  describe('findCreatorProfile', () => {
    it('should return user with public AIs', async () => {
      const user = {
        id: 'user-1',
        name: 'Alice',
        username: 'alice',
        bio: 'AI builder',
        image: null,
        createdAt: new Date(),
        ais: [{ id: 'ai-1', name: 'Legal Bot' }],
      };
      mockUser.findUnique.mockResolvedValue(user);

      const result = await service.findCreatorProfile('alice');

      expect(result).toBe(user);
      expect(mockUser.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: 'alice' },
        })
      );
    });

    it('should throw NotFoundException for unknown username', async () => {
      mockUser.findUnique.mockResolvedValue(null);

      await expect(service.findCreatorProfile('unknown-user')).rejects.toThrow(NotFoundException);
    });
  });
});
