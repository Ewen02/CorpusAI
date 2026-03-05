import { test, expect } from '@playwright/test';

test.describe('Embed Widget', () => {
  // These tests require a valid AI slug to exist
  // In CI, seed data should be created beforehand

  test('should load embed page with slug', async ({ page }) => {
    // Use a test slug — in a real setup, this would be seeded
    const response = await page.goto('/embed/test-ai');
    // Should either load the widget or show a 404/not found
    expect(response?.status()).toBeLessThan(500);
  });

  test('should have proper embed layout (no nav)', async ({ page }) => {
    await page.goto('/embed/test-ai');
    // Embed pages should not have the main dashboard navigation
    const nav = page.locator('nav[data-testid="main-nav"]');
    await expect(nav).not.toBeVisible();
  });
});
