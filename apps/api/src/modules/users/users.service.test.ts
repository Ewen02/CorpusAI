import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aI: {
      aggregate: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
    },
    dailyStats: {
      findMany: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@corpusai/subscription', () => ({
  getFeatureLimits: vi.fn().mockReturnValue({
    maxAIs: 3,
    maxDocumentsPerAI: 20,
    maxQuestionsPerDay: 100,
    maxDocumentSizeMB: 10,
  }),
  getRemainingUsage: vi.fn().mockReturnValue(5),
}));

import { prisma } from '@corpusai/database';

const mockUser = prisma.user as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockAI = prisma.aI as unknown as { aggregate: ReturnType<typeof vi.fn> };
const mockAccount = prisma.account as unknown as { findMany: ReturnType<typeof vi.fn> };
const mockMessage = prisma.message as unknown as { count: ReturnType<typeof vi.fn> };

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        image: null,
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
        subscriptionStart: null,
        subscriptionEnd: null,
        createdAt: new Date(),
        _count: { ais: 2 },
      };
      mockUser.findUnique.mockResolvedValue(user);

      const result = await service.getProfile('user-1');
      expect(result).toBe(user);
      expect(mockUser.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user name and image', async () => {
      const updated = {
        id: 'user-1',
        email: 'test@test.com',
        name: 'New Name',
        image: null,
        updatedAt: new Date(),
      };
      mockUser.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { name: 'New Name' });
      expect(result).toBe(updated);
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { name: 'New Name', image: undefined },
        })
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should return aggregated stats', async () => {
      mockUser.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE' });
      mockAI.aggregate.mockResolvedValue({
        _count: 3,
        _sum: { documentCount: 10, conversationCount: 5, questionCount: 20 },
      });

      const result = await service.getDashboardStats('user-1');
      expect(result).toEqual({
        aiCount: 3,
        documentCount: 10,
        conversationCount: 5,
        questionCount: 20,
        subscriptionPlan: 'FREE',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);
      mockAI.aggregate.mockResolvedValue({ _count: 0, _sum: {} });

      await expect(service.getDashboardStats('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAccounts', () => {
    it('should return user accounts', async () => {
      const accounts = [
        { providerId: 'credential', createdAt: new Date() },
        { providerId: 'google', createdAt: new Date() },
      ];
      mockAccount.findMany.mockResolvedValue(accounts);

      const result = await service.getAccounts('user-1');
      expect(result).toBe(accounts);
    });
  });

  describe('getUsage', () => {
    it('should return usage data with limits', async () => {
      mockUser.findUnique.mockResolvedValue({
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'ACTIVE',
        subscriptionEnd: null,
        _count: { ais: 1 },
      });
      mockMessage.count.mockResolvedValue(10);

      const result = await service.getUsage('user-1');
      expect(result.plan).toBe('FREE');
      expect(result.limits.ais.used).toBe(1);
      expect(result.limits.ais.max).toBe(3);
      expect(result.limits.questionsPerDay.used).toBe(10);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);
      await expect(service.getUsage('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
