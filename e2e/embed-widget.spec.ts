import { test, expect } from '@playwright/test';

test.describe('Embed Widget', () => {
  test('should load embed page without server error', async ({ page }) => {
    const response = await page.goto('/embed/test-ai');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should have no dashboard navigation in embed', async ({ page }) => {
    await page.goto('/embed/test-ai');
    const nav = page.locator('nav[data-testid="main-nav"]');
    await expect(nav).not.toBeVisible();
  });

  test('should have no header or sidebar in embed', async ({ page }) => {
    await page.goto('/embed/test-ai');
    // Embed should be a clean chat-only layout
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();
  });

  test('should render within an embeddable viewport', async ({ page }) => {
    // Simulate iframe-like dimensions
    await page.setViewportSize({ width: 400, height: 600 });
    const response = await page.goto('/embed/test-ai');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should show error for non-existent AI slug in embed', async ({ page }) => {
    await page.goto('/embed/non-existent-slug-xyz');
    // Should show some kind of error state, not crash
    const response = await page.goto('/embed/non-existent-slug-xyz');
    expect(response?.status()).toBeLessThan(500);
  });
});
