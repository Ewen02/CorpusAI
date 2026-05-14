import { test, expect } from '@playwright/test';
import { signUp } from './fixtures/auth';
import { TEST_PASSWORD, uniqueAIName, uniqueEmail } from './fixtures/test-data';

/**
 * End-to-end flow for a brand-new creator:
 *   sign-up -> onboarding -> /ais/new wizard -> AI visible on dashboard / list.
 *
 * The onboarding wizard is multi-step; this spec covers the simpler
 * "skip onboarding, go straight to /ais/new" path because that's the
 * canonical creation flow from the dashboard once a user is logged in.
 */
test.describe('Sign-up to first AI flow', () => {
  test('should sign up, reach onboarding, then create an AI via /ais/new', async ({ page }) => {
    const email = uniqueEmail();
    const aiName = uniqueAIName();

    // Step 1 — Sign up via UI. Redirects to /onboarding.
    await signUp(page, 'First AI Creator', email, TEST_PASSWORD);
    await expect(page).toHaveURL(/onboarding/);

    // Step 2 — Onboarding welcome screen should be visible.
    // The wizard exposes a "start" button as well as a "explore dashboard" escape hatch.
    const exploreDashboardBtn = page.getByRole('button', { name: /explorer le dashboard/i });
    await expect(exploreDashboardBtn).toBeVisible({ timeout: 5_000 });

    // Skip the wizard by clicking the dashboard escape hatch.
    await exploreDashboardBtn.click();
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page).toHaveURL(/dashboard/);

    // Step 3 — Navigate to /ais/new and create the AI.
    await page.goto('/ais/new');
    await expect(page.getByText(/créer un assistant ia/i)).toBeVisible({ timeout: 5_000 });

    await page.getByLabel(/nom de l'assistant/i).fill(aiName);
    await page.getByRole('button', { name: /créer l'assistant/i }).click();

    // Step 4 — Redirect to AI detail page.
    await page.waitForURL(/\/ais\/[a-z0-9]/i, { timeout: 10_000 });
    await expect(page.getByText(aiName)).toBeVisible({ timeout: 5_000 });

    // Step 5 — The AI should appear in the list at /ais.
    await page.goto('/ais');
    await expect(page.getByText(aiName)).toBeVisible({ timeout: 5_000 });
  });

  test('should display the onboarding wizard immediately after sign-up', async ({ page }) => {
    const email = uniqueEmail();
    await signUp(page, 'Wizard Tester', email, TEST_PASSWORD);

    await expect(page).toHaveURL(/onboarding/);
    // The first step shows the welcome heading using "Bienvenue, {firstName}".
    await expect(page.getByRole('heading', { name: /bienvenue/i })).toBeVisible({
      timeout: 5_000,
    });
    // The primary "Commencer" CTA must be present.
    await expect(page.getByRole('button', { name: /commencer/i })).toBeVisible();
  });
});
