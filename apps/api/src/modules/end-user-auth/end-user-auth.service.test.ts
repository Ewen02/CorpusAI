import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { EndUserAuthService } from './end-user-auth.service';

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'mock-token-hex-value'),
  })),
}));

vi.mock('@corpusai/database', () => ({
  prisma: {
    endUser: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    aI: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@corpusai/database';

const mockEndUser = prisma.endUser as unknown as {
  upsert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};

const mockAI = prisma.aI as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
};

describe('EndUserAuthService', () => {
  let service: EndUserAuthService;
  const mockMailService = {
    sendMagicLink: vi.fn(),
  };

  beforeEach(() => {
    service = new EndUserAuthService(mockMailService as any);
    vi.clearAllMocks();
  });

  describe('sendMagicLink', () => {
    it('should create endUser if not exists via upsert', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-1', email: 'end@user.com' });
      mockEndUser.update.mockResolvedValue({});
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('end@user.com');

      expect(mockEndUser.upsert).toHaveBeenCalledWith({
        where: { email: 'end@user.com' },
        create: { email: 'end@user.com' },
        update: {},
      });
    });

    it('should update existing endUser with new token', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-2', email: 'existing@user.com' });
      mockEndUser.update.mockResolvedValue({});
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('existing@user.com');

      expect(mockEndUser.update).toHaveBeenCalledWith({
        where: { id: 'eu-2' },
        data: {
          magicLinkToken: 'mock-token-hex-value',
          magicLinkExpires: expect.any(Date),
        },
      });
    });

    it('should call mailService.sendMagicLink', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-3', email: 'mail@test.com' });
      mockEndUser.update.mockResolvedValue({});
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('mail@test.com');

      expect(mockMailService.sendMagicLink).toHaveBeenCalledWith(
        'mail@test.com',
        'mock-token-hex-value',
        undefined
      );
    });

    it('should pass AI name when aiSlug is provided', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-4', email: 'slug@test.com' });
      mockEndUser.update.mockResolvedValue({});
      mockAI.findUnique.mockResolvedValue({ name: 'My Assistant' });
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('slug@test.com', 'my-assistant');

      expect(mockAI.findUnique).toHaveBeenCalledWith({
        where: { slug: 'my-assistant' },
        select: { name: true },
      });
      expect(mockMailService.sendMagicLink).toHaveBeenCalledWith(
        'slug@test.com',
        'mock-token-hex-value',
        'My Assistant'
      );
    });
  });

  describe('verifyMagicLink', () => {
    it('should return session token for valid token', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      mockEndUser.findUnique.mockResolvedValue({
        id: 'eu-1',
        magicLinkToken: 'valid-token',
        magicLinkExpires: futureDate,
      });
      mockEndUser.update.mockResolvedValue({});

      const sessionToken = await service.verifyMagicLink('valid-token');

      expect(sessionToken).toBe('mock-token-hex-value');
      expect(mockEndUser.findUnique).toHaveBeenCalledWith({
        where: { magicLinkToken: 'valid-token' },
      });
      expect(mockEndUser.update).toHaveBeenCalledWith({
        where: { id: 'eu-1' },
        data: {
          magicLinkToken: null,
          magicLinkExpires: null,
          sessionToken: 'mock-token-hex-value',
          sessionExpires: expect.any(Date),
          emailVerified: true,
        },
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockEndUser.findUnique.mockResolvedValue(null);

      await expect(service.verifyMagicLink('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      mockEndUser.findUnique.mockResolvedValue({
        id: 'eu-1',
        magicLinkToken: 'expired-token',
        magicLinkExpires: pastDate,
      });

      await expect(service.verifyMagicLink('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when magicLinkExpires is null', async () => {
      mockEndUser.findUnique.mockResolvedValue({
        id: 'eu-1',
        magicLinkToken: 'token-no-expiry',
        magicLinkExpires: null,
      });

      await expect(service.verifyMagicLink('token-no-expiry')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('signOut', () => {
    it('should delete session', async () => {
      mockEndUser.updateMany.mockResolvedValue({ count: 1 });

      await service.signOut('session-token-123');

      expect(mockEndUser.updateMany).toHaveBeenCalledWith({
        where: { sessionToken: 'session-token-123' },
        data: { sessionToken: null, sessionExpires: null },
      });
    });

    it('should not throw if session does not exist', async () => {
      mockEndUser.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.signOut('nonexistent-token')).resolves.toBeUndefined();
    });
  });
});
