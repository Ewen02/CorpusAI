import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AIsService } from './ais.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    aI: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  AIStatus: { ACTIVE: 'ACTIVE', DRAFT: 'DRAFT', ARCHIVED: 'ARCHIVED' },
}));

vi.mock('@corpusai/subscription', () => ({
  getFeatureLimits: vi.fn().mockReturnValue({ maxAIs: 3 }),
  canCreateAI: vi.fn().mockReturnValue(true),
}));

import { prisma } from '@corpusai/database';
import { canCreateAI } from '@corpusai/subscription';

const mockAI = prisma.aI as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};
const mockUser = prisma.user as unknown as { findUnique: ReturnType<typeof vi.fn> };

describe('AIsService', () => {
  let service: AIsService;
  const mockRagService = { deleteAIVectors: vi.fn() };
  const mockTextGenerationService = { generateAISuggestions: vi.fn() };
  const mockOwnershipService = {
    verifyAIOwnership: vi.fn().mockResolvedValue(undefined),
    getOwnedAI: vi.fn(),
    verifyDocumentOwnership: vi.fn(),
    verifyConversationOwnership: vi.fn(),
  };

  // Mock repository that delegates to the same prisma mocks
  const mockRepo = {
    findAllByUser: vi.fn((...args: unknown[]) =>
      mockAI.findMany({ where: { userId: args[0] }, skip: args[1], take: args[2] })
    ),
    findOneWithDocuments: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    ),
    findByUserAndSlug: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[1], user: { username: args[0] } } })
    ),
    findUserWithAICount: vi.fn((...args: unknown[]) =>
      mockUser.findUnique({ where: { id: args[0] } })
    ),
    findSlugForUser: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[0], userId: args[1] } })
    ),
    create: vi.fn((...args: unknown[]) => mockAI.create({ data: args[1] })),
    update: vi.fn((...args: unknown[]) => mockAI.update({ where: { id: args[0] }, data: args[1] })),
    delete: vi.fn((...args: unknown[]) => mockAI.delete({ where: { id: args[0] } })),
    findForSuggestions: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    ),
    findStats: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    ),
    findDocumentForAI: vi.fn(),
    findForAccess: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    ),
    updateAccessToken: vi.fn(),
    findWithUsername: vi.fn(),
    updateAccessCode: vi.fn(),
    updateInviteOnly: vi.fn(),
    updateAccessMode: vi.fn(),
    findActiveMembers: vi.fn(),
    countActiveGrants: vi.fn(),
    findUserPlan: vi.fn(),
    findUserUsername: vi.fn(),
    upsertEndUser: vi.fn(),
    upsertAccessGrant: vi.fn(),
    revokeGrant: vi.fn(),
    findDailyStats: vi.fn(),
    getConfidenceStats: vi.fn(),
    getFeedbackStats: vi.fn(),
    getAvgMessagesPerConversation: vi.fn(),
    getUniqueUsers: vi.fn(),
    getKnowledgeBase: vi.fn(),
    getTopQuestions: vi.fn(),
    getRetention: vi.fn(),
    getFunnelData: vi.fn(),
    getDocumentUsage: vi.fn(),
    getDocumentChunkUsage: vi.fn(),
  };

  beforeEach(() => {
    service = new AIsService(
      mockRagService as any,
      mockTextGenerationService as any,
      mockOwnershipService as any,
      mockRepo as any
    );
    vi.clearAllMocks();
    (canCreateAI as ReturnType<typeof vi.fn>).mockReturnValue(true);

    // Re-apply default delegates after clearAllMocks
    mockRepo.findAllByUser.mockImplementation((...args: unknown[]) =>
      mockAI.findMany({ where: { userId: args[0] }, skip: args[1], take: args[2] })
    );
    mockRepo.findOneWithDocuments.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    );
    mockRepo.findByUserAndSlug.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[1], user: { username: args[0] } } })
    );
    mockRepo.findUserWithAICount.mockImplementation((...args: unknown[]) =>
      mockUser.findUnique({ where: { id: args[0] } })
    );
    mockRepo.findSlugForUser.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[0], userId: args[1] } })
    );
    mockRepo.create.mockImplementation((...args: unknown[]) => mockAI.create({ data: args[1] }));
    mockRepo.update.mockImplementation((...args: unknown[]) =>
      mockAI.update({ where: { id: args[0] }, data: args[1] })
    );
    mockRepo.delete.mockImplementation((...args: unknown[]) =>
      mockAI.delete({ where: { id: args[0] } })
    );
    mockRepo.findForSuggestions.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    );
    mockRepo.findStats.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    );
    mockRepo.findForAccess.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { id: args[0], userId: args[1] } })
    );
    mockOwnershipService.verifyAIOwnership.mockResolvedValue(undefined);
  });

  describe('findAll', () => {
    it('should return paginated AIs for user', async () => {
      const ais = [{ id: 'ai-1', name: 'Test AI' }];
      mockAI.findMany.mockResolvedValue(ais);

      const result = await service.findAll('user-1', { skip: 0, take: 10 });
      expect(result).toBe(ais);
    });

    it('should use default pagination', async () => {
      mockAI.findMany.mockResolvedValue([]);
      await service.findAll('user-1');
      expect(mockRepo.findAllByUser).toHaveBeenCalledWith('user-1', 0, 50);
    });
  });

  describe('findOne', () => {
    it('should return AI with documents', async () => {
      const ai = {
        id: 'ai-1',
        name: 'Test',
        documents: [],
        accessToken: null,
        accessCode: null,
        _count: { documents: 0, conversations: 0 },
      };
      mockAI.findFirst.mockResolvedValue(ai);

      const result = await service.findOne('user-1', 'ai-1');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'ai-1',
          name: 'Test',
          hasAccessToken: false,
          hasAccessCode: false,
        })
      );
    });

    it('should throw NotFoundException when AI not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'ai-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserAndSlug', () => {
    it('should return active AI by username and slug', async () => {
      const ai = { id: 'ai-1', slug: 'test-ai', status: 'ACTIVE' };
      mockAI.findFirst.mockResolvedValue(ai);

      const result = await service.findByUserAndSlug('jean', 'test-ai');
      expect(result).toBe(ai);
    });

    it('should throw when AI is not active', async () => {
      mockAI.findFirst.mockResolvedValue({ id: 'ai-1', slug: 'test', status: 'DRAFT' });
      await expect(service.findByUserAndSlug('jean', 'test')).rejects.toThrow(NotFoundException);
    });

    it('should throw when slug not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.findByUserAndSlug('jean', 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      slug: 'my-ai',
      name: 'My AI',
      description: 'A test AI',
      accessType: 'FREE' as const,
    };

    it('should create AI when within limits', async () => {
      mockUser.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', _count: { ais: 1 } });
      mockAI.findFirst.mockResolvedValue(null); // slug not taken
      mockAI.create.mockResolvedValue({ id: 'ai-new', ...dto });

      const result = await service.create('user-1', dto);
      expect(result.id).toBe('ai-new');
    });

    it('should throw ForbiddenException when AI limit reached', async () => {
      mockUser.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', _count: { ais: 3 } });
      (canCreateAI as ReturnType<typeof vi.fn>).mockReturnValue(false);

      await expect(service.create('user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when slug is taken', async () => {
      mockUser.findUnique.mockResolvedValue({ subscriptionPlan: 'FREE', _count: { ais: 0 } });
      mockAI.findFirst.mockResolvedValue({ id: 'existing' }); // slug taken for this user

      await expect(service.create('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUser.findUnique.mockResolvedValue(null);
      await expect(service.create('missing', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update AI', async () => {
      mockAI.update.mockResolvedValue({ id: 'ai-1', name: 'Updated' });

      const result = await service.update('user-1', 'ai-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when AI not owned', async () => {
      mockOwnershipService.verifyAIOwnership.mockRejectedValueOnce(
        new NotFoundException('AI not found')
      );
      await expect(service.update('user-1', 'ai-1', { name: 'X' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('delete', () => {
    it('should delete AI and clean up Qdrant', async () => {
      mockAI.delete.mockResolvedValue({});

      const result = await service.delete('user-1', 'ai-1');
      expect(result).toEqual({ success: true });
      expect(mockRagService.deleteAIVectors).toHaveBeenCalledWith('ai-1');
    });

    it('should still delete even if Qdrant cleanup fails', async () => {
      mockRagService.deleteAIVectors.mockRejectedValue(new Error('qdrant down'));
      mockAI.delete.mockResolvedValue({});

      const result = await service.delete('user-1', 'ai-1');
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when AI not found', async () => {
      mockOwnershipService.verifyAIOwnership.mockRejectedValueOnce(
        new NotFoundException('AI not found')
      );
      await expect(service.delete('user-1', 'ai-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return AI stats', async () => {
      mockAI.findFirst.mockResolvedValue({
        documentCount: 5,
        conversationCount: 10,
        questionCount: 25,
        _count: { documents: 5, conversations: 10 },
      });

      const result = await service.getStats('user-1', 'ai-1');
      expect(result).toEqual({ documents: 5, conversations: 10, questions: 25 });
    });

    it('should throw NotFoundException when AI not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(service.getStats('user-1', 'ai-1')).rejects.toThrow(NotFoundException);
    });
  });
});
