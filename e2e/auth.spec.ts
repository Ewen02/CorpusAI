import { test, expect } from '@playwright/test';
import { createTestUser, signUp } from './fixtures/auth';
import { uniqueEmail, TEST_PASSWORD } from './fixtures/test-data';

test.describe('Authentication', () => {
  test.describe('Sign-in page', () => {
    test('should display the sign-in form', async ({ page }) => {
      await page.goto('/sign-in');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Mot de passe')).toBeVisible();
      await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
    });

    test('should sign in with valid credentials and redirect to dashboard', async ({
      page,
      request,
    }) => {
      const user = await createTestUser(request);
      await page.goto('/sign-in');
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Mot de passe').fill(user.password);
      await page.getByRole('button', { name: /se connecter/i }).click();
      await page.waitForURL('**/dashboard', { timeout: 10_000 });
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should show error with wrong password', async ({ page, request }) => {
      const user = await createTestUser(request);
      await page.goto('/sign-in');
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Mot de passe').fill('WrongPassword!');
      await page.getByRole('button', { name: /se connecter/i }).click();
      await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 5_000 });
    });

    test('should navigate to forgot password', async ({ page }) => {
      await page.goto('/sign-in');
      await page.getByText('Mot de passe oublié').click();
      await expect(page).toHaveURL(/forgot-password/);
    });

    test('should navigate to sign-up', async ({ page }) => {
      await page.goto('/sign-in');
      await page.getByText('Créer un compte').click();
      await expect(page).toHaveURL(/sign-up/);
    });
  });

  test.describe('Sign-up page', () => {
    test('should display the sign-up form', async ({ page }) => {
      await page.goto('/sign-up');
      await expect(page.getByLabel('Nom')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Mot de passe')).toBeVisible();
      await expect(page.getByRole('button', { name: /créer mon compte/i })).toBeVisible();
    });

    test('should sign up and redirect to onboarding', async ({ page }) => {
      const email = uniqueEmail();
      await signUp(page, 'New E2E User', email, TEST_PASSWORD);
      await expect(page).toHaveURL(/onboarding/);
    });
  });

  test.describe('Protected routes', () => {
    test('should redirect unauthenticated user to sign-in', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForURL('**/sign-in**', { timeout: 5_000 });
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should redirect /ais to sign-in when unauthenticated', async ({ page }) => {
      await page.goto('/ais');
      await page.waitForURL('**/sign-in**', { timeout: 5_000 });
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Forgot password', () => {
    test('should show forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByRole('button', { name: /envoyer/i })).toBeVisible();
    });
  });
});
