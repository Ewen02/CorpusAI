import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PortalService } from './portal.service';

vi.mock('@corpusai/database', () => ({
  prisma: {
    aIAccessGrant: {
      findMany: vi.fn(),
    },
    conversation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  AccessStatus: { ACTIVE: 'ACTIVE', REVOKED: 'REVOKED' },
}));

import { prisma } from '@corpusai/database';

const mockAccessGrant = prisma.aIAccessGrant as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};
const mockConversation = prisma.conversation as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
};

const mockEndUser = {
  id: 'eu-1',
  email: 'end@test.com',
  name: 'End User',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

describe('PortalService', () => {
  let service: PortalService;

  const mockRepo = {
    findActiveGrants: vi.fn(() => mockAccessGrant.findMany()),
    findConversations: vi.fn((...args: unknown[]) =>
      mockConversation.findMany({ where: { endUserId: args[0] } })
    ),
    findConversation: vi.fn((...args: unknown[]) =>
      mockConversation.findFirst({ where: { id: args[1], endUserId: args[0] } })
    ),
  };

  beforeEach(() => {
    service = new PortalService(mockRepo as any);
    vi.clearAllMocks();

    mockRepo.findActiveGrants.mockImplementation(() => mockAccessGrant.findMany());
    mockRepo.findConversations.mockImplementation((...args: unknown[]) =>
      mockConversation.findMany({ where: { endUserId: args[0] } })
    );
    mockRepo.findConversation.mockImplementation((...args: unknown[]) =>
      mockConversation.findFirst({ where: { id: args[1], endUserId: args[0] } })
    );
  });

  describe('getMe', () => {
    it('should return endUser profile with AIs', async () => {
      const grants = [
        {
          ai: {
            id: 'ai-1',
            slug: 'bot-a',
            name: 'Bot A',
            description: 'Desc',
            primaryColor: '#fff',
            logo: null,
          },
        },
        {
          ai: {
            id: 'ai-2',
            slug: 'bot-b',
            name: 'Bot B',
            description: null,
            primaryColor: null,
            logo: null,
          },
        },
      ];
      mockAccessGrant.findMany.mockResolvedValue(grants);

      const result = await service.getMe(mockEndUser as any);

      expect(result.id).toBe('eu-1');
      expect(result.email).toBe('end@test.com');
      expect(result.name).toBe('End User');
      expect(result.ais).toEqual([grants[0]!.ai, grants[1]!.ai]);
      expect(mockRepo.findActiveGrants).toHaveBeenCalledWith('eu-1');
    });
  });

  describe('getConversations', () => {
    it('should return conversations for endUser', async () => {
      const conversations = [
        {
          id: 'conv-1',
          title: 'Chat 1',
          messageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
          ai: { id: 'ai-1', slug: 'bot', name: 'Bot', primaryColor: null, logo: null },
        },
      ];
      mockConversation.findMany.mockResolvedValue(conversations);

      const result = await service.getConversations(mockEndUser as any);

      expect(result).toBe(conversations);
      expect(mockRepo.findConversations).toHaveBeenCalledWith('eu-1');
    });
  });

  describe('getConversation', () => {
    it('should return single conversation with messages', async () => {
      const conversation = {
        id: 'conv-1',
        endUserId: 'eu-1',
        messages: [{ id: 'msg-1', content: 'Hello' }],
        ai: { id: 'ai-1', slug: 'bot', name: 'Bot', primaryColor: null, logo: null },
      };
      mockConversation.findFirst.mockResolvedValue(conversation);

      const result = await service.getConversation(mockEndUser as any, 'conv-1');

      expect(result).toBe(conversation);
      expect(mockConversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1', endUserId: 'eu-1' },
        })
      );
    });

    it('should throw NotFoundException if conversation not found', async () => {
      mockConversation.findFirst.mockResolvedValue(null);

      await expect(service.getConversation(mockEndUser as any, 'conv-999')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if conversation belongs to another endUser', async () => {
      // findFirst with where: { id, endUserId } will return null when endUserId does not match
      mockConversation.findFirst.mockResolvedValue(null);

      const otherEndUser = { ...mockEndUser, id: 'eu-other' };
      await expect(service.getConversation(otherEndUser as any, 'conv-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
