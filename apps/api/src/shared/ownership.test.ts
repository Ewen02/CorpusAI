import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// Mock the database module
vi.mock('@corpusai/database', () => ({
  prisma: {
    aI: {
      findFirst: vi.fn(),
    },
    document: {
      findFirst: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@corpusai/database';
import {
  verifyAIOwnership,
  getOwnedAI,
  verifyDocumentOwnership,
  verifyConversationOwnership,
} from './ownership';

const mockAI = prisma.aI as unknown as { findFirst: ReturnType<typeof vi.fn> };
const mockDocument = prisma.document as unknown as { findFirst: ReturnType<typeof vi.fn> };
const mockConversation = prisma.conversation as unknown as { findUnique: ReturnType<typeof vi.fn> };

describe('Ownership utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyAIOwnership', () => {
    it('should resolve when AI exists and is owned by user', async () => {
      mockAI.findFirst.mockResolvedValue({ id: 'ai-1' });
      await expect(verifyAIOwnership('ai-1', 'user-1')).resolves.toBeUndefined();
      expect(mockAI.findFirst).toHaveBeenCalledWith({
        where: { id: 'ai-1', userId: 'user-1' },
        select: { id: true },
      });
    });

    it('should throw NotFoundException when AI not found', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(verifyAIOwnership('ai-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOwnedAI', () => {
    it('should return AI when found', async () => {
      const ai = { id: 'ai-1', name: 'Test AI', userId: 'user-1' };
      mockAI.findFirst.mockResolvedValue(ai);
      const result = await getOwnedAI('ai-1', 'user-1');
      expect(result).toBe(ai);
    });

    it('should throw NotFoundException when AI not owned', async () => {
      mockAI.findFirst.mockResolvedValue(null);
      await expect(getOwnedAI('ai-1', 'wrong-user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyDocumentOwnership', () => {
    it('should return ids when document is owned by user', async () => {
      mockDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        ai: { id: 'ai-1', userId: 'user-1' },
      });
      const result = await verifyDocumentOwnership('doc-1', 'user-1');
      expect(result).toEqual({ documentId: 'doc-1', aiId: 'ai-1' });
    });

    it('should throw when document not found', async () => {
      mockDocument.findFirst.mockResolvedValue(null);
      await expect(verifyDocumentOwnership('doc-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw when user does not own the document AI', async () => {
      mockDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        ai: { id: 'ai-1', userId: 'other-user' },
      });
      await expect(verifyDocumentOwnership('doc-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyConversationOwnership', () => {
    it('should return ids when conversation is owned by user', async () => {
      mockConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        ai: { id: 'ai-1', userId: 'user-1' },
      });
      const result = await verifyConversationOwnership('conv-1', 'user-1');
      expect(result).toEqual({ conversationId: 'conv-1', aiId: 'ai-1' });
    });

    it('should throw when conversation not found', async () => {
      mockConversation.findUnique.mockResolvedValue(null);
      await expect(verifyConversationOwnership('conv-1', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw when user does not own the conversation AI', async () => {
      mockConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        ai: { id: 'ai-1', userId: 'other-user' },
      });
      await expect(verifyConversationOwnership('conv-1', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
