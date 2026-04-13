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
      findFirst: vi.fn(),
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
  findFirst: ReturnType<typeof vi.fn>;
};

describe('EndUserAuthService', () => {
  let service: EndUserAuthService;
  const mockMailService = {
    sendMagicLink: vi.fn(),
  };

  const mockRepo = {
    upsertEndUser: vi.fn((...args: unknown[]) => mockEndUser.upsert({ where: { email: args[0] } })),
    setMagicLink: vi.fn((...args: unknown[]) => mockEndUser.update({ where: { id: args[0] } })),
    findAIBySlugAndUsername: vi.fn((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[0] } })
    ),
    findByMagicLinkToken: vi.fn((...args: unknown[]) =>
      mockEndUser.findUnique({ where: { magicLinkToken: args[0] } })
    ),
    activateSession: vi.fn((...args: unknown[]) => mockEndUser.update({ where: { id: args[0] } })),
    clearSession: vi.fn((...args: unknown[]) =>
      mockEndUser.updateMany({ where: { sessionToken: args[0] } })
    ),
  };

  beforeEach(() => {
    service = new EndUserAuthService(mockMailService as any, mockRepo as any);
    vi.clearAllMocks();

    mockRepo.upsertEndUser.mockImplementation((...args: unknown[]) =>
      mockEndUser.upsert({ where: { email: args[0] } })
    );
    mockRepo.setMagicLink.mockImplementation((...args: unknown[]) =>
      mockEndUser.update({ where: { id: args[0] } })
    );
    mockRepo.findAIBySlugAndUsername.mockImplementation((...args: unknown[]) =>
      mockAI.findFirst({ where: { slug: args[0] } })
    );
    mockRepo.findByMagicLinkToken.mockImplementation((...args: unknown[]) =>
      mockEndUser.findUnique({ where: { magicLinkToken: args[0] } })
    );
    mockRepo.activateSession.mockImplementation((...args: unknown[]) =>
      mockEndUser.update({ where: { id: args[0] } })
    );
    mockRepo.clearSession.mockImplementation((...args: unknown[]) =>
      mockEndUser.updateMany({ where: { sessionToken: args[0] } })
    );
  });

  describe('sendMagicLink', () => {
    it('should create endUser if not exists via upsert', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-1', email: 'end@user.com' });
      mockEndUser.update.mockResolvedValue({});
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('end@user.com');

      expect(mockRepo.upsertEndUser).toHaveBeenCalledWith('end@user.com');
    });

    it('should update existing endUser with new token', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-2', email: 'existing@user.com' });
      mockEndUser.update.mockResolvedValue({});
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('existing@user.com');

      expect(mockRepo.setMagicLink).toHaveBeenCalledWith(
        'eu-2',
        'mock-token-hex-value',
        expect.any(Date)
      );
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

    it('should pass AI name when aiSlug and username are provided', async () => {
      mockEndUser.upsert.mockResolvedValue({ id: 'eu-4', email: 'slug@test.com' });
      mockEndUser.update.mockResolvedValue({});
      mockAI.findFirst.mockResolvedValue({ name: 'My Assistant' });
      mockMailService.sendMagicLink.mockResolvedValue(undefined);

      await service.sendMagicLink('slug@test.com', 'my-assistant', 'jean');

      expect(mockAI.findFirst).toHaveBeenCalled();
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
      expect(mockRepo.findByMagicLinkToken).toHaveBeenCalledWith('valid-token');
      expect(mockRepo.activateSession).toHaveBeenCalledWith(
        'eu-1',
        'mock-token-hex-value',
        expect.any(Date)
      );
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

      expect(mockRepo.clearSession).toHaveBeenCalledWith('session-token-123');
    });

    it('should not throw if session does not exist', async () => {
      mockEndUser.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.signOut('nonexistent-token')).resolves.toBeUndefined();
    });
  });
});
