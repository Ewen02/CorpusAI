import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import type { OwnershipRepository } from './ownership.repository';

function makeRepo() {
  return {
    findAIByIdAndUser: vi.fn(),
    findFullAIByIdAndUser: vi.fn(),
    findDocumentWithOwner: vi.fn(),
    findConversationWithOwner: vi.fn(),
  };
}

describe('OwnershipService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: OwnershipService;

  beforeEach(() => {
    repo = makeRepo();
    service = new OwnershipService(repo as unknown as OwnershipRepository);
  });

  describe('verifyAIOwnership', () => {
    it('resolves when AI is found for user', async () => {
      repo.findAIByIdAndUser.mockResolvedValue({ id: 'ai-1' });
      await expect(service.verifyAIOwnership('ai-1', 'user-1')).resolves.toBeUndefined();
      expect(repo.findAIByIdAndUser).toHaveBeenCalledWith('ai-1', 'user-1');
    });

    it('throws NotFoundException when AI is missing', async () => {
      repo.findAIByIdAndUser.mockResolvedValue(null);
      await expect(service.verifyAIOwnership('ai-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe('getOwnedAI', () => {
    it('returns AI when owned', async () => {
      const ai = { id: 'ai-1', name: 'Test' };
      repo.findFullAIByIdAndUser.mockResolvedValue(ai);
      await expect(service.getOwnedAI('ai-1', 'user-1')).resolves.toBe(ai);
    });

    it('throws when AI is missing', async () => {
      repo.findFullAIByIdAndUser.mockResolvedValue(null);
      await expect(service.getOwnedAI('ai-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('verifyDocumentOwnership', () => {
    it('returns ids when document is owned', async () => {
      repo.findDocumentWithOwner.mockResolvedValue({
        id: 'doc-1',
        ai: { id: 'ai-1', userId: 'user-1' },
      });
      await expect(service.verifyDocumentOwnership('doc-1', 'user-1')).resolves.toEqual({
        documentId: 'doc-1',
        aiId: 'ai-1',
      });
    });

    it('throws when document is missing', async () => {
      repo.findDocumentWithOwner.mockResolvedValue(null);
      await expect(service.verifyDocumentOwnership('doc-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('throws when document is owned by another user', async () => {
      repo.findDocumentWithOwner.mockResolvedValue({
        id: 'doc-1',
        ai: { id: 'ai-1', userId: 'user-2' },
      });
      await expect(service.verifyDocumentOwnership('doc-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe('verifyConversationOwnership', () => {
    it('returns ids when conversation is owned', async () => {
      repo.findConversationWithOwner.mockResolvedValue({
        id: 'conv-1',
        ai: { id: 'ai-1', userId: 'user-1' },
      });
      await expect(service.verifyConversationOwnership('conv-1', 'user-1')).resolves.toEqual({
        conversationId: 'conv-1',
        aiId: 'ai-1',
      });
    });

    it('throws when conversation is owned by another user', async () => {
      repo.findConversationWithOwner.mockResolvedValue({
        id: 'conv-1',
        ai: { id: 'ai-1', userId: 'user-2' },
      });
      await expect(service.verifyConversationOwnership('conv-1', 'user-1')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });
});
