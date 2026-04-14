import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('better-auth/node', () => ({
  fromNodeHeaders: vi.fn((h) => h),
}));

import { AuthService } from './auth.service';
import { auth } from '../../lib/auth';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

describe('AuthService', () => {
  let service: AuthService;
  const mockRepo = {
    findUserById: vi.fn(),
    findUserWithAIs: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(mockRepo as any);
  });

  describe('validateSession', () => {
    it('returns session when valid', async () => {
      const session = { user: { id: 'u-1' } };
      mockGetSession.mockResolvedValue(session);

      const result = await service.validateSession({ headers: {} } as any);
      expect(result).toBe(session);
    });

    it('throws UnauthorizedException when session is null', async () => {
      mockGetSession.mockResolvedValue(null);
      await expect(service.validateSession({ headers: {} } as any)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('getSessionFromHeaders', () => {
    it('delegates to auth.api.getSession', async () => {
      const session = { user: { id: 'u-1' } };
      mockGetSession.mockResolvedValue(session);

      const headers = new Headers();
      const result = await service.getSessionFromHeaders(headers);
      expect(result).toBe(session);
      expect(mockGetSession).toHaveBeenCalledWith({ headers });
    });
  });

  describe('getUserById', () => {
    it('delegates to repo.findUserById', async () => {
      mockRepo.findUserById.mockResolvedValue({ id: 'u-1' });
      const result = await service.getUserById('u-1');
      expect(result).toEqual({ id: 'u-1' });
      expect(mockRepo.findUserById).toHaveBeenCalledWith('u-1');
    });
  });

  describe('getUserWithAIs', () => {
    it('delegates to repo.findUserWithAIs', async () => {
      mockRepo.findUserWithAIs.mockResolvedValue({ id: 'u-1', ais: [] });
      const result = await service.getUserWithAIs('u-1');
      expect(result).toEqual({ id: 'u-1', ais: [] });
      expect(mockRepo.findUserWithAIs).toHaveBeenCalledWith('u-1');
    });
  });
});
