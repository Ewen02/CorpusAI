import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

// Mock the auth module
vi.mock('../../lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { auth } from '../../lib/auth';

const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;

function createMockContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = { headers } as Record<string, unknown>;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard();
    vi.clearAllMocks();
  });

  it('should throw UnauthorizedException when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow access with valid session and active subscription', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1', subscriptionStatus: 'ACTIVE' },
    });
    const context = createMockContext({ authorization: 'Bearer token' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should attach session and user to request', async () => {
    const session = { id: 'session-1' };
    const user = { id: 'user-1', subscriptionStatus: 'ACTIVE' };
    mockGetSession.mockResolvedValue({ session, user });

    const request = { headers: {} } as Record<string, unknown>;
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    await guard.canActivate(context);
    expect(request.session).toBe(session);
    expect(request.user).toBe(user);
  });

  it('should throw ForbiddenException when subscription is CANCELED', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1', subscriptionStatus: 'CANCELED' },
    });
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when subscription is PAST_DUE', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1', subscriptionStatus: 'PAST_DUE' },
    });
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when subscriptionStatus is undefined', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1' },
    });
    const context = createMockContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access when subscriptionStatus is TRIALING', async () => {
    mockGetSession.mockResolvedValue({
      session: { id: 'session-1' },
      user: { id: 'user-1', subscriptionStatus: 'TRIALING' },
    });
    const context = createMockContext();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
