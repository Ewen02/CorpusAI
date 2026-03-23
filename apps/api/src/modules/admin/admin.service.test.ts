import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from './admin.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    aI: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    document: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    conversation: {
      count: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@corpusai/database';

const mockUser = prisma.user as unknown as {
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockAI = prisma.aI as unknown as {
  count: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};
const mockDocument = prisma.document as unknown as {
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};
const mockConversation = prisma.conversation as unknown as { count: ReturnType<typeof vi.fn> };
const mockMessage = prisma.message as unknown as { count: ReturnType<typeof vi.fn> };

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    service = new AdminService();
    vi.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return aggregated stats', async () => {
      mockUser.count.mockResolvedValue(10);
      mockAI.count.mockResolvedValue(5);
      mockDocument.count.mockResolvedValue(20);
      mockConversation.count.mockResolvedValue(50);
      mockMessage.count.mockResolvedValue(200);
      mockUser.groupBy.mockResolvedValue([
        { subscriptionPlan: 'FREE', _count: 8 },
        { subscriptionPlan: 'PRO', _count: 2 },
      ]);
      mockDocument.groupBy.mockResolvedValue([
        { status: 'INDEXED', _count: 18 },
        { status: 'FAILED', _count: 2 },
      ]);

      const result = await service.getDashboard();

      expect(result).toMatchObject({
        totals: {
          users: 10,
          ais: 5,
          documents: 20,
          conversations: 50,
          messages: 200,
        },
        usersByPlan: expect.arrayContaining([
          { plan: 'FREE', count: 8 },
          { plan: 'PRO', count: 2 },
        ]),
        documentsByStatus: expect.arrayContaining([
          { status: 'INDEXED', count: 18 },
          { status: 'FAILED', count: 2 },
        ]),
      });
    });

    it('should use cached result on second call within TTL', async () => {
      const cachedService = new AdminService();
      mockUser.count.mockResolvedValue(1);
      mockAI.count.mockResolvedValue(1);
      mockDocument.count.mockResolvedValue(1);
      mockConversation.count.mockResolvedValue(1);
      mockMessage.count.mockResolvedValue(1);
      mockUser.groupBy.mockResolvedValue([]);
      mockDocument.groupBy.mockResolvedValue([]);

      await cachedService.getDashboard();
      const callsAfterFirst = mockUser.count.mock.calls.length;
      await cachedService.getDashboard();

      // Second call should not trigger any new DB queries due to cache
      expect(mockUser.count).toHaveBeenCalledTimes(callsAfterFirst);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [{ id: 'user-1', email: 'test@example.com', role: 'USER' }];
      mockUser.findMany.mockResolvedValue(users);
      mockUser.count.mockResolvedValue(1);

      const result = await service.getUsers(1, 20);

      expect(result.users).toBe(users);
      expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('should filter users by search query', async () => {
      mockUser.findMany.mockResolvedValue([]);
      mockUser.count.mockResolvedValue(0);

      await service.getUsers(1, 20, 'alice');

      expect(mockUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        })
      );
    });

    it('should return all users when no search query', async () => {
      mockUser.findMany.mockResolvedValue([]);
      mockUser.count.mockResolvedValue(0);

      await service.getUsers();

      expect(mockUser.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('getAIs', () => {
    it('should return paginated AIs with owner info', async () => {
      const ais = [{ id: 'ai-1', name: 'Test AI', user: { email: 'owner@example.com' } }];
      mockAI.findMany.mockResolvedValue(ais);
      mockAI.count.mockResolvedValue(1);

      const result = await service.getAIs(1, 20);

      expect(result.ais).toBe(ais);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const updated = { id: 'user-1', email: 'test@example.com', role: 'ADMIN' };
      mockUser.update.mockResolvedValue(updated);

      const result = await service.updateUserRole('user-1', 'ADMIN');

      expect(result).toBe(updated);
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { role: 'ADMIN' },
        })
      );
    });
  });

  describe('updateUserPlan', () => {
    it('should update user subscription plan', async () => {
      const updated = { id: 'user-1', email: 'test@example.com', subscriptionPlan: 'PRO' };
      mockUser.update.mockResolvedValue(updated);

      const result = await service.updateUserPlan('user-1', 'PRO');

      expect(result).toBe(updated);
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ subscriptionPlan: 'PRO' }),
        })
      );
    });

    it('should set subscriptionStatus to ACTIVE when downgrading to FREE', async () => {
      mockUser.update.mockResolvedValue({ id: 'user-1', subscriptionPlan: 'FREE' });

      await service.updateUserPlan('user-1', 'FREE');

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subscriptionPlan: 'FREE',
            subscriptionStatus: 'ACTIVE',
          }),
        })
      );
    });
  });
});
