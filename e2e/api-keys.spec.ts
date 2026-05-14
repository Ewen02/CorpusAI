import { expect } from '@playwright/test';
import { test } from './fixtures/auth';

/**
 * API keys management page at /settings/api-keys.
 *
 * The page lets a creator:
 *   - create a key (name optional, defaults to "Default")
 *   - copy the full key, displayed exactly once with the `cai_` prefix
 *   - see existing keys in the table with their prefix
 *   - delete an existing key
 */
test.describe('API keys (authenticated)', () => {
  test('should create a key, show the cai_ prefix, list it, then delete it', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings/api-keys');
    await expect(page.getByRole('heading', { name: /clés api/i })).toBeVisible({
      timeout: 5_000,
    });

    // Step 1 — fill the name input and click "Créer".
    const keyName = `E2E Key ${Date.now().toString(36)}`;
    await page.getByPlaceholder(/nom de la clé/i).fill(keyName);
    await page.getByRole('button', { name: /^créer$/i }).click();

    // Step 2 — the newly created key panel appears with a "cai_" prefix.
    const fullKey = page.locator('code').filter({ hasText: /^cai_/ }).first();
    await expect(fullKey).toBeVisible({ timeout: 5_000 });
    const keyText = (await fullKey.textContent()) ?? '';
    expect(keyText.startsWith('cai_')).toBe(true);

    // Step 3 — verify the key is listed in the existing keys table.
    // Look for the prefix display "<prefix>..." pattern.
    await expect(page.getByText(keyName)).toBeVisible({ timeout: 5_000 });

    // Step 4 — delete the key (trash icon button). Find by row, then click ghost button.
    // We target the row by name, then look for the destructive icon button inside it.
    const row = page.getByText(keyName).locator('..').locator('..');
    const deleteBtn = row.getByRole('button').last();
    await deleteBtn.click();

    // The row should disappear (or the no-keys message reappears).
    await expect(page.getByText(keyName)).toBeHidden({ timeout: 5_000 });
  });

  test('should show empty state when no API keys exist', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/api-keys');
    await expect(page.getByRole('heading', { name: /clés api/i })).toBeVisible({
      timeout: 5_000,
    });

    // A fresh user starts with zero keys. The page renders the empty-state copy.
    await expect(page.getByText(/aucune clé api/i)).toBeVisible({ timeout: 5_000 });
  });

  test('should display documentation snippets on the API keys page', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/settings/api-keys');
    await expect(page.getByRole('heading', { name: /documentation api/i })).toBeVisible({
      timeout: 5_000,
    });
    // The page must show the bearer-token sample with the cai_ placeholder.
    await expect(page.getByText(/Bearer cai_/).first()).toBeVisible({ timeout: 5_000 });
  });
});
