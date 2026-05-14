import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CollaboratorRole } from '@corpusai/database';
import { CollaboratorsService } from './collaborators.service';

function makeRepo() {
  return {
    findById: vi.fn(),
    findByAi: vi.fn(),
    findByAiAndEmail: vi.fn(),
    findByToken: vi.fn(),
    findUserByEmail: vi.fn(),
    createInvite: vi.fn(),
    updateRole: vi.fn(),
    delete: vi.fn(),
    acceptInvite: vi.fn(),
    findAIForInvite: vi.fn(),
  };
}

function makeOwnership() {
  return {
    verifyAIOwnership: vi.fn().mockResolvedValue(undefined),
    verifyAIEditAccess: vi.fn(),
    getOwnedAI: vi.fn(),
    verifyDocumentOwnership: vi.fn(),
    verifyConversationOwnership: vi.fn(),
  };
}

function makeMail() {
  return {
    sendMagicLink: vi.fn(),
    sendInvite: vi.fn(),
    sendCollaboratorInvite: vi.fn().mockResolvedValue(undefined),
    sendWelcome: vi.fn(),
    sendDocumentIndexed: vi.fn(),
    sendDocumentFailed: vi.fn(),
  };
}

describe('CollaboratorsService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let ownership: ReturnType<typeof makeOwnership>;
  let mail: ReturnType<typeof makeMail>;
  let service: CollaboratorsService;

  beforeEach(() => {
    repo = makeRepo();
    ownership = makeOwnership();
    mail = makeMail();
    service = new CollaboratorsService(repo as any, ownership as any, mail as any);
  });

  describe('list', () => {
    it('verifies ownership then returns repo result', async () => {
      const rows = [{ id: 'c1' }];
      repo.findByAi.mockResolvedValue(rows);

      const out = await service.list('ai-1', 'owner-1');
      expect(ownership.verifyAIOwnership).toHaveBeenCalledWith('ai-1', 'owner-1');
      expect(repo.findByAi).toHaveBeenCalledWith('ai-1');
      expect(out).toBe(rows);
    });

    it('throws when not owner', async () => {
      ownership.verifyAIOwnership.mockRejectedValueOnce(new NotFoundException('AI not found'));
      await expect(service.list('ai-1', 'intruder')).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findByAi).not.toHaveBeenCalled();
    });
  });

  describe('invite', () => {
    const baseInvite = (overrides: Partial<{ acceptedAt: Date | null }> = {}) => {
      repo.findAIForInvite.mockResolvedValue({
        id: 'ai-1',
        slug: 'my-ai',
        name: 'My AI',
        language: 'en',
      });
      repo.findByAiAndEmail.mockResolvedValue(null);
      repo.findUserByEmail.mockResolvedValue(null);
      repo.createInvite.mockResolvedValue({
        id: 'collab-1',
        email: 'guest@test.com',
        role: CollaboratorRole.EDITOR,
        acceptedAt: overrides.acceptedAt ?? null,
      });
    };

    it('creates an invite and sends an email when caller is owner', async () => {
      baseInvite();
      const out = await service.invite(
        'ai-1',
        'owner-1',
        'Owner Name',
        'GUEST@test.com',
        CollaboratorRole.EDITOR,
        'https://app.test.io'
      );

      expect(ownership.verifyAIOwnership).toHaveBeenCalledWith('ai-1', 'owner-1');
      expect(repo.createInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          aiId: 'ai-1',
          email: 'guest@test.com', // normalized
          role: CollaboratorRole.EDITOR,
          invitedBy: 'owner-1',
        })
      );
      expect(mail.sendCollaboratorInvite).toHaveBeenCalledWith(
        'guest@test.com',
        'My AI',
        'Owner Name',
        expect.stringMatching(/^https:\/\/app\.test\.io\/team-invite\//),
        'en'
      );
      expect(out.inviteUrl).toMatch(/^https:\/\/app\.test\.io\/team-invite\//);
    });

    it('throws ConflictException when collaborator already invited', async () => {
      repo.findAIForInvite.mockResolvedValue({
        id: 'ai-1',
        slug: 'my-ai',
        name: 'My AI',
        language: 'fr',
      });
      repo.findByAiAndEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.invite(
          'ai-1',
          'owner-1',
          'Owner',
          'guest@test.com',
          CollaboratorRole.EDITOR,
          'https://app.test.io'
        )
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repo.createInvite).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when inviting self', async () => {
      repo.findAIForInvite.mockResolvedValue({
        id: 'ai-1',
        slug: 'my-ai',
        name: 'My AI',
        language: 'fr',
      });
      repo.findByAiAndEmail.mockResolvedValue(null);
      repo.findUserByEmail.mockResolvedValue({ id: 'owner-1', email: 'owner@test.com' });

      await expect(
        service.invite(
          'ai-1',
          'owner-1',
          'Owner',
          'owner@test.com',
          CollaboratorRole.EDITOR,
          'https://app.test.io'
        )
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when not owner', async () => {
      ownership.verifyAIOwnership.mockRejectedValueOnce(new NotFoundException('AI not found'));

      await expect(
        service.invite(
          'ai-1',
          'intruder',
          'Intruder',
          'guest@test.com',
          CollaboratorRole.EDITOR,
          'https://app.test.io'
        )
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repo.createInvite).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('updates when collaborator belongs to owned AI', async () => {
      repo.findById.mockResolvedValue({ id: 'c1', aiId: 'ai-1' });
      repo.updateRole.mockResolvedValue({ id: 'c1', role: CollaboratorRole.VIEWER });

      const out = await service.updateRole('ai-1', 'c1', 'owner-1', CollaboratorRole.VIEWER);
      expect(repo.updateRole).toHaveBeenCalledWith('c1', CollaboratorRole.VIEWER);
      expect(out.role).toBe(CollaboratorRole.VIEWER);
    });

    it('throws when collaborator belongs to a different AI', async () => {
      repo.findById.mockResolvedValue({ id: 'c1', aiId: 'other-ai' });

      await expect(
        service.updateRole('ai-1', 'c1', 'owner-1', CollaboratorRole.VIEWER)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('revoke', () => {
    it('deletes when collaborator belongs to owned AI', async () => {
      repo.findById.mockResolvedValue({ id: 'c1', aiId: 'ai-1' });
      repo.delete.mockResolvedValue({ id: 'c1' });

      const out = await service.revoke('ai-1', 'c1', 'owner-1');
      expect(repo.delete).toHaveBeenCalledWith('c1');
      expect(out).toEqual({ success: true });
    });
  });

  describe('accept', () => {
    const token = 'token-abc';

    it('accepts a pending invite when emails match', async () => {
      repo.findByToken.mockResolvedValue({
        id: 'c1',
        aiId: 'ai-1',
        userId: null,
        email: 'guest@test.com',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400_000),
        ai: { id: 'ai-1', slug: 'my-ai', name: 'My AI' },
      });
      repo.acceptInvite.mockResolvedValue({
        id: 'c1',
        aiId: 'ai-1',
        role: CollaboratorRole.EDITOR,
      });

      const out = await service.accept(token, 'user-2', 'GUEST@test.com');
      expect(repo.acceptInvite).toHaveBeenCalledWith('c1', 'user-2');
      expect(out).toEqual({ aiId: 'ai-1', aiSlug: 'my-ai', role: CollaboratorRole.EDITOR });
    });

    it('throws NotFoundException when token is unknown', async () => {
      repo.findByToken.mockResolvedValue(null);
      await expect(service.accept(token, 'user-2', 'guest@test.com')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });

    it('throws BadRequestException when invite is already accepted', async () => {
      repo.findByToken.mockResolvedValue({
        id: 'c1',
        aiId: 'ai-1',
        email: 'guest@test.com',
        userId: 'user-2',
        acceptedAt: new Date(),
        expiresAt: null,
        ai: { id: 'ai-1', slug: 'my-ai', name: 'My AI' },
      });
      await expect(service.accept(token, 'user-2', 'guest@test.com')).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('throws BadRequestException when invite is expired', async () => {
      repo.findByToken.mockResolvedValue({
        id: 'c1',
        aiId: 'ai-1',
        email: 'guest@test.com',
        userId: null,
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        ai: { id: 'ai-1', slug: 'my-ai', name: 'My AI' },
      });
      await expect(service.accept(token, 'user-2', 'guest@test.com')).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('throws ForbiddenException when email does not match the invitee', async () => {
      repo.findByToken.mockResolvedValue({
        id: 'c1',
        aiId: 'ai-1',
        email: 'guest@test.com',
        userId: null,
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400_000),
        ai: { id: 'ai-1', slug: 'my-ai', name: 'My AI' },
      });

      await expect(service.accept(token, 'user-2', 'someone-else@test.com')).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(repo.acceptInvite).not.toHaveBeenCalled();
    });
  });
});
