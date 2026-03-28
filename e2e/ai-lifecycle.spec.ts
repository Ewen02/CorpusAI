import { expect } from '@playwright/test';
import { test } from './fixtures/auth';
import { uniqueAIName } from './fixtures/test-data';

test.describe('AI Lifecycle (authenticated)', () => {
  test('should create a new AI and redirect to detail page', async ({
    authenticatedPage: page,
  }) => {
    const aiName = uniqueAIName();

    // Navigate to create page
    await page.goto('/ais/new');
    await expect(page.getByText('Créer un assistant IA')).toBeVisible();

    // Fill the name field (first tab - General)
    await page.getByLabel(/nom de l'assistant/i).fill(aiName);

    // Submit the form
    await page.getByRole('button', { name: /créer l'assistant/i }).click();

    // Should redirect to the AI detail page
    await page.waitForURL('**/ais/**', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/ais\/[a-z0-9]/);

    // The AI name should be visible on the detail page
    await expect(page.getByText(aiName)).toBeVisible();
  });

  test('should show tabs on AI detail page', async ({ authenticatedPage: page }) => {
    const aiName = uniqueAIName();

    // Create AI first
    await page.goto('/ais/new');
    await page.getByLabel(/nom de l'assistant/i).fill(aiName);
    await page.getByRole('button', { name: /créer l'assistant/i }).click();
    await page.waitForURL('**/ais/**', { timeout: 10_000 });

    // Verify tabs are visible
    await expect(page.getByRole('tab', { name: /chat/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /documents/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /conversations/i })).toBeVisible();
  });

  test('should switch between tabs', async ({ authenticatedPage: page }) => {
    const aiName = uniqueAIName();

    // Create AI
    await page.goto('/ais/new');
    await page.getByLabel(/nom de l'assistant/i).fill(aiName);
    await page.getByRole('button', { name: /créer l'assistant/i }).click();
    await page.waitForURL('**/ais/**', { timeout: 10_000 });

    // Click Documents tab
    await page.getByRole('tab', { name: /documents/i }).click();
    // Should show document uploader
    await expect(page.getByText(/glissez|aucun document/i).first()).toBeVisible({ timeout: 5_000 });

    // Click Conversations tab
    await page.getByRole('tab', { name: /conversations/i }).click();
    await expect(page.getByText(/aucune conversation|conversation/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('should list created AI on the AIs page', async ({ authenticatedPage: page }) => {
    const aiName = uniqueAIName();

    // Create AI
    await page.goto('/ais/new');
    await page.getByLabel(/nom de l'assistant/i).fill(aiName);
    await page.getByRole('button', { name: /créer l'assistant/i }).click();
    await page.waitForURL('**/ais/**', { timeout: 10_000 });

    // Go to AIs list
    await page.goto('/ais');
    await expect(page.getByText(aiName)).toBeVisible({ timeout: 5_000 });
  });
});
