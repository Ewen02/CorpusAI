import { expect } from '@playwright/test';
import { test } from './fixtures/auth';
import { createAIViaAPI, setAccessCode, setInviteOnly } from './fixtures/ai';
import { uniqueAIName } from './fixtures/test-data';

/**
 * Public chat access control. Three variants are covered:
 *
 *   1. GATED (accessCode):
 *      - opening the chat without `?code=` shows the code prompt
 *      - submitting a wrong code surfaces an error
 *      - submitting the right code unlocks the chat
 *
 *   2. Invite-only:
 *      - opening the chat without an `eu_session` cookie shows the
 *        "sign in to portal" CTA pointing to /portal/sign-in
 *
 *   3. The creator who owns the AI can still always access it through
 *      the dashboard (sanity check, separate flow).
 */
test.describe('Public chat — access control', () => {
  test.describe('GATED by access code', () => {
    test('should prompt for an access code and unlock with the correct value', async ({
      authenticatedPage: page,
      testUser,
    }) => {
      // Step 1 — Create AI + lock with an access code.
      const aiName = uniqueAIName();
      const slug = `gated-${Date.now().toString(36)}`;
      const ai = await createAIViaAPI(page.request, { name: aiName, slug, isPublic: true });
      const accessCode = 'OPENSESAME2026';
      await setAccessCode(page.request, ai.id, accessCode);

      // Step 2 — As an unauthenticated end-user, fetch the creator's username from
      // the user profile so we can build a /chat/@username/slug URL.
      // The session cookies are stored on the same browser context — we need a
      // fresh context to act as a public visitor. We use Playwright's
      // `browser` via `page.context().browser()` to spin one up.
      const browser = page.context().browser();
      test.skip(!browser, 'Browser instance unavailable');

      // Resolve the username through the authenticated /users/me-like response.
      // The signed-in fixture stores `testUser`, but the username is auto-generated
      // server-side; we read it from the /users/me profile endpoint.
      const meResponse = await page.request.get(
        `${process.env.E2E_API_URL || 'http://localhost:3001'}/users/me`
      );
      test.skip(!meResponse.ok(), `Cannot resolve current user: ${meResponse.status()}`);
      const me = (await meResponse.json()) as { username?: string | null };
      const username = me.username;
      test.skip(!username, 'Test user has no username; cannot build public chat URL');

      // Step 3 — Open a fresh, unauthenticated browser context.
      const publicContext = await browser!.newContext();
      const publicPage = await publicContext.newPage();
      try {
        await publicPage.goto(`/chat/@${username}/${slug}`);

        // The page asks for an access code.
        await expect(
          publicPage.getByRole('heading', { name: new RegExp(aiName, 'i') })
        ).toBeVisible({ timeout: 10_000 });
        await expect(publicPage.getByPlaceholder(/code d'accès/i)).toBeVisible({
          timeout: 5_000,
        });

        // Step 4 — Wrong code first.
        await publicPage.getByPlaceholder(/code d'accès/i).fill('WRONG-CODE');
        await publicPage.getByRole('button', { name: /accéder/i }).click();
        await expect(publicPage.getByText(/incorrect|invalid/i).first()).toBeVisible({
          timeout: 5_000,
        });

        // Step 5 — Right code unlocks. The chat composer placeholder appears.
        await publicPage.getByPlaceholder(/code d'accès/i).fill(accessCode);
        await publicPage.getByRole('button', { name: /accéder/i }).click();

        await expect(publicPage.getByPlaceholder(/posez votre question/i)).toBeVisible({
          timeout: 10_000,
        });
      } finally {
        await publicContext.close();
      }

      // Silence unused warnings about testUser (kept for fixture).
      expect(testUser.email).toBeTruthy();
    });
  });

  test.describe('Invite-only', () => {
    test('should show the "sign in to portal" CTA when not authenticated', async ({
      authenticatedPage: page,
    }) => {
      const aiName = uniqueAIName();
      const slug = `invite-${Date.now().toString(36)}`;
      const ai = await createAIViaAPI(page.request, { name: aiName, slug, isPublic: true });
      await setInviteOnly(page.request, ai.id, true);

      const meResponse = await page.request.get(
        `${process.env.E2E_API_URL || 'http://localhost:3001'}/users/me`
      );
      test.skip(!meResponse.ok(), `Cannot resolve current user: ${meResponse.status()}`);
      const me = (await meResponse.json()) as { username?: string | null };
      const username = me.username;
      test.skip(!username, 'Test user has no username; cannot build public chat URL');

      const browser = page.context().browser();
      test.skip(!browser, 'Browser instance unavailable');

      const publicContext = await browser!.newContext();
      const publicPage = await publicContext.newPage();
      try {
        await publicPage.goto(`/chat/@${username}/${slug}`);

        // Heading shows the AI name (or the generic "thisAssistant" copy).
        await expect(
          publicPage.getByText(/réservé aux membres invités|invite/i).first()
        ).toBeVisible({ timeout: 10_000 });

        // The "Se connecter" CTA is rendered as a link pointing to /portal/sign-in.
        const signInLink = publicPage.getByRole('link', { name: /se connecter/i });
        await expect(signInLink).toBeVisible({ timeout: 5_000 });
        const href = await signInLink.getAttribute('href');
        expect(href).toContain('/portal/sign-in');
        expect(href).toContain('callbackUrl');
      } finally {
        await publicContext.close();
      }
    });
  });

  test.describe('FREE / public', () => {
    test('should render the chat composer without any access prompt', async ({
      authenticatedPage: page,
    }) => {
      const aiName = uniqueAIName();
      const slug = `open-${Date.now().toString(36)}`;
      await createAIViaAPI(page.request, { name: aiName, slug, isPublic: true });

      const meResponse = await page.request.get(
        `${process.env.E2E_API_URL || 'http://localhost:3001'}/users/me`
      );
      test.skip(!meResponse.ok(), `Cannot resolve current user: ${meResponse.status()}`);
      const me = (await meResponse.json()) as { username?: string | null };
      const username = me.username;
      test.skip(!username, 'Test user has no username; cannot build public chat URL');

      const browser = page.context().browser();
      test.skip(!browser, 'Browser instance unavailable');

      const publicContext = await browser!.newContext();
      const publicPage = await publicContext.newPage();
      try {
        await publicPage.goto(`/chat/@${username}/${slug}`);

        // No code prompt, no invite-only screen — the composer is directly visible.
        await expect(publicPage.getByPlaceholder(/posez votre question/i)).toBeVisible({
          timeout: 10_000,
        });
        await expect(publicPage.getByPlaceholder(/code d'accès/i)).toBeHidden();
      } finally {
        await publicContext.close();
      }
    });
  });
});
