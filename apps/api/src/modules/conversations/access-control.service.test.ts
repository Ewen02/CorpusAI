import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

vi.mock('bcryptjs', () => ({
  compare: vi.fn(async (input: string, hashed: string) => input === `plain:${hashed}`),
}));

describe('AccessControlService', () => {
  let service: AccessControlService;
  const mockRepo = {
    findAccessGrant: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AccessControlService(mockRepo as any);
  });

  describe('OPEN mode', () => {
    it('allows when no access requirements', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: null, inviteOnly: false },
          undefined,
          undefined,
          null
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('GATED token mode', () => {
    it('allows when token matches', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: 'secret-token', accessCode: null, inviteOnly: false },
          'secret-token',
          undefined,
          null
        )
      ).resolves.toBeUndefined();
    });

    it('throws access_token when token mismatches', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: 'secret-token', accessCode: null, inviteOnly: false },
          'wrong',
          undefined,
          null
        )
      ).rejects.toMatchObject({
        response: { reason: 'access_token' },
      });
    });

    it('throws access_token when token missing', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: 'secret-token', accessCode: null, inviteOnly: false },
          undefined,
          undefined,
          null
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('GATED code mode', () => {
    it('allows when bcrypt code matches', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: 'hashed', inviteOnly: false },
          undefined,
          'plain:hashed',
          null
        )
      ).resolves.toBeUndefined();
    });

    it('throws access_code when code mismatches', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: 'hashed', inviteOnly: false },
          undefined,
          'wrong',
          null
        )
      ).rejects.toMatchObject({ response: { reason: 'access_code' } });
    });

    it('throws access_code when code missing', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: 'hashed', inviteOnly: false },
          undefined,
          undefined,
          null
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('MEMBER invite-only mode', () => {
    it('throws invite_only when no end-user', async () => {
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: null, inviteOnly: true },
          undefined,
          undefined,
          null
        )
      ).rejects.toMatchObject({ response: { reason: 'invite_only' } });
    });

    it('throws invite_only when no grant', async () => {
      mockRepo.findAccessGrant.mockResolvedValue(null);
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: null, inviteOnly: true },
          undefined,
          undefined,
          { id: 'eu-1' }
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws invite_only when grant expired', async () => {
      mockRepo.findAccessGrant.mockResolvedValue({
        id: 'g1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: null, inviteOnly: true },
          undefined,
          undefined,
          { id: 'eu-1' }
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('allows when grant active and not expired', async () => {
      mockRepo.findAccessGrant.mockResolvedValue({
        id: 'g1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: null, inviteOnly: true },
          undefined,
          undefined,
          { id: 'eu-1' }
        )
      ).resolves.toBeUndefined();
    });

    it('allows when grant active and no expiry', async () => {
      mockRepo.findAccessGrant.mockResolvedValue({
        id: 'g1',
        status: 'ACTIVE',
        expiresAt: null,
      });
      await expect(
        service.checkAIAccess(
          { id: 'ai-1', accessToken: null, accessCode: null, inviteOnly: true },
          undefined,
          undefined,
          { id: 'eu-1' }
        )
      ).resolves.toBeUndefined();
    });
  });
});
