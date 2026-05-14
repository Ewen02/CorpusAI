import { test, expect } from '@playwright/test';
import { API_URL, TEST_PASSWORD, uniqueEmail } from './fixtures/test-data';

/**
 * Rate-limiting guard on Better Auth's /auth/sign-up/email endpoint.
 *
 * Better Auth fronts the request with the global Throttler. Hammering it
 * from the same IP with 4 distinct emails should produce either:
 *   - 429 Too Many Requests, or
 *   - a non-2xx response by the 4th attempt.
 *
 * The test passes if *any* of the four attempts is rate-limited or rejected,
 * because exact thresholds may vary by environment.
 */
test.describe('Rate limiting — sign-up endpoint', () => {
  test('should reject the 4th consecutive sign-up attempt with 429 or non-2xx', async ({
    request,
  }) => {
    const attempts = 4;
    const statuses: number[] = [];

    for (let i = 0; i < attempts; i += 1) {
      const response = await request.post(`${API_URL}/auth/sign-up/email`, {
        data: {
          name: `Rate Limit User ${i}`,
          email: uniqueEmail(),
          password: TEST_PASSWORD,
        },
        headers: { 'Content-Type': 'application/json' },
        // Don't throw on non-2xx — we explicitly want to inspect the status.
        failOnStatusCode: false,
      });
      statuses.push(response.status());
    }

    // Skip cleanly if the backend isn't reachable (all statuses are 0).
    test.skip(
      statuses.every((s) => s === 0),
      'API unreachable — skipping rate-limit assertion'
    );

    // We expect either a 429 anywhere, OR the 4th attempt to fail (status >= 400).
    const sawRateLimit = statuses.some((s) => s === 429);
    const lastAttemptFailed = (statuses[statuses.length - 1] ?? 200) >= 400;

    expect(
      sawRateLimit || lastAttemptFailed,
      `Expected a 429 or a 4xx by attempt #${attempts}, got statuses=${statuses.join(',')}`
    ).toBe(true);
  });

  test('should not rate-limit a single valid sign-up', async ({ request }) => {
    const response = await request.post(`${API_URL}/auth/sign-up/email`, {
      data: {
        name: 'Solo Sign-up',
        email: uniqueEmail(),
        password: TEST_PASSWORD,
      },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    });

    test.skip(response.status() === 0, 'API unreachable — skipping');

    // A single sign-up must never be 429.
    expect(response.status()).not.toBe(429);
  });
});
