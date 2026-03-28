import { test, expect } from '@playwright/test';

test.describe('Public Chat', () => {
  test('should show error for non-existent AI slug', async ({ page }) => {
    await page.goto('/chat/non-existent-ai-slug-12345');
    // Should show some error or not found state
    await expect(page.getByText(/introuvable|not found|erreur|n'existe pas/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('should not have dashboard navigation on chat page', async ({ page }) => {
    await page.goto('/chat/non-existent-ai-slug-12345');
    // The main dashboard sidebar should not be present
    const sidebar = page.locator('nav[data-testid="main-nav"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('should load chat page without server error', async ({ page }) => {
    const response = await page.goto('/chat/test-slug');
    // Should not return a 500 error
    expect(response?.status()).toBeLessThan(500);
  });
});
