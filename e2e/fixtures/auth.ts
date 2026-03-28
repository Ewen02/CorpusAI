import { test as base, type Page, type APIRequestContext } from '@playwright/test';
import { API_URL, TEST_PASSWORD, uniqueEmail } from './test-data';

interface TestUser {
  email: string;
  password: string;
  name: string;
}

/**
 * Create a test user via the Better Auth API.
 */
export async function createTestUser(request: APIRequestContext): Promise<TestUser> {
  const email = uniqueEmail();
  const name = 'E2E User';

  const response = await request.post(`${API_URL}/auth/sign-up/email`, {
    data: { name, email, password: TEST_PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test user: ${response.status()} ${await response.text()}`);
  }

  return { email, password: TEST_PASSWORD, name };
}

/**
 * Sign in via the UI. After this, the page has an authenticated session.
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

/**
 * Sign up via the UI. After this, the page redirects to /onboarding.
 */
export async function signUp(
  page: Page,
  name: string,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/sign-up');
  await page.getByLabel('Nom').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /créer mon compte/i }).click();
  await page.waitForURL('**/onboarding', { timeout: 10_000 });
}

/**
 * Playwright fixture that provides an authenticated page.
 * Creates a fresh user, signs in, and yields the page.
 */
export const test = base.extend<{ authenticatedPage: Page; testUser: TestUser }>({
  testUser: async ({ request }, use) => {
    const user = await createTestUser(request);
    await use(user);
  },
  authenticatedPage: async ({ page, testUser }, use) => {
    await signIn(page, testUser.email, testUser.password);
    await use(page);
  },
});
