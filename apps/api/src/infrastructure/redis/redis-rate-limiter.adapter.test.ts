import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisRateLimiterAdapter } from './redis-rate-limiter.adapter';

describe('RedisRateLimiterAdapter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  it('returns null (fail-open) when redis is null', async () => {
    const adapter = new RedisRateLimiterAdapter(null);
    const result = await adapter.checkAndIncrement('k', 10, 60);
    expect(result).toBeNull();
  });

  it('sets TTL on first increment using window × 2', async () => {
    const redis = { incr: vi.fn().mockResolvedValue(1), expire: vi.fn().mockResolvedValue(1) };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    const result = await adapter.checkAndIncrement('user:1', 10, 60);

    expect(redis.incr).toHaveBeenCalledTimes(1);
    expect(redis.expire).toHaveBeenCalledWith(expect.any(String), 120);
    expect(result?.count).toBe(1);
    expect(result?.remaining).toBe(9);
  });

  it('does not call expire on subsequent increments', async () => {
    const redis = { incr: vi.fn().mockResolvedValue(2), expire: vi.fn() };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    await adapter.checkAndIncrement('user:1', 10, 60);

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('returns remaining=0 when count exceeds limit', async () => {
    const redis = { incr: vi.fn().mockResolvedValue(15), expire: vi.fn() };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    const result = await adapter.checkAndIncrement('user:1', 10, 60);
    expect(result?.remaining).toBe(0);
  });

  it('returns null and logs warning when redis throws', async () => {
    const redis = {
      incr: vi.fn().mockRejectedValue(new Error('connection lost')),
      expire: vi.fn(),
    };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    const result = await adapter.checkAndIncrement('user:1', 10, 60);
    expect(result).toBeNull();
  });

  it('computes resetAt as (windowStart + 1) * windowSeconds', async () => {
    const redis = { incr: vi.fn().mockResolvedValue(1), expire: vi.fn().mockResolvedValue(1) };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    // 2026-01-01T00:00:00Z = epoch 1767225600s, window 60s → windowStart = floor(1767225600 / 60) = 29453760
    // resetAt = 29453761 * 60 = 1767225660
    const result = await adapter.checkAndIncrement('k', 10, 60);
    expect(result?.resetAt).toBe(1767225660);
  });

  it('uses different redis keys for different windows', async () => {
    const redis = { incr: vi.fn().mockResolvedValue(1), expire: vi.fn().mockResolvedValue(1) };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    await adapter.checkAndIncrement('user:1', 10, 60);
    const firstKey = redis.incr.mock.calls[0]![0];

    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    await adapter.checkAndIncrement('user:1', 10, 60);
    const secondKey = redis.incr.mock.calls[1]![0];

    expect(firstKey).not.toBe(secondKey);
  });

  it('passes limit through unchanged in result', async () => {
    const redis = { incr: vi.fn().mockResolvedValue(3), expire: vi.fn() };
    const adapter = new RedisRateLimiterAdapter(redis as any);

    const result = await adapter.checkAndIncrement('k', 42, 60);
    expect(result?.limit).toBe(42);
  });
});
