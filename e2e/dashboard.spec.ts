import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

test.describe('Dashboard (authenticated)', () => {
  test('should display the dashboard with stats', async ({ authenticatedPage: page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // Dashboard should show stat cards
    await expect(page.getByText(/AIs?/i).first()).toBeVisible();
  });

  test('should navigate to AIs page via sidebar', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /mes ais/i }).click();
    await page.waitForURL('**/ais', { timeout: 5_000 });
    await expect(page).toHaveURL(/\/ais$/);
  });

  test('should navigate to Analytics via sidebar', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /analytics/i }).click();
    await page.waitForURL('**/analytics', { timeout: 5_000 });
    await expect(page).toHaveURL(/analytics/);
  });

  test('should navigate to Settings via sidebar', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: /settings/i }).click();
    await page.waitForURL('**/settings', { timeout: 5_000 });
    await expect(page).toHaveURL(/settings/);
  });

  test('should show user info in sidebar', async ({ authenticatedPage: page, testUser }) => {
    // The sidebar should display the user's email or name
    await expect(page.getByText(testUser.name)).toBeVisible();
  });

  test('should have a create AI button', async ({ authenticatedPage: page }) => {
    const createButton = page
      .getByRole('link', { name: /créer|nouveau/i })
      .or(page.getByRole('button', { name: /créer|nouveau/i }));
    await expect(createButton.first()).toBeVisible();
  });
});
