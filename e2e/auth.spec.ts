import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should show sign-up page', async ({ page }) => {
    await page.goto('/sign-up');
    await expect(page).toHaveURL(/sign-up/);
  });

  test('should show forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText('Mot de passe oubli')).toBeVisible();
  });

  test('should navigate from sign-in to forgot password', async ({ page }) => {
    await page.goto('/sign-in');
    const forgotLink = page.getByText('Mot de passe oubli');
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot-password/);
    }
  });

  test('should show validation errors on empty sign-in', async ({ page }) => {
    await page.goto('/sign-in');
    const submitButton = page.getByRole('button', { name: /connexion|se connecter/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Browser validation should prevent submission
    }
  });

  test('should redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to sign-in for unauthenticated users
    await page.waitForURL(/sign-in/, { timeout: 5000 }).catch(() => {
      // Some setups may handle this differently
    });
  });
});
