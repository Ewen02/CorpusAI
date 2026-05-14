import { test, expect } from '@playwright/test';
import { uniqueEmail } from './fixtures/test-data';

/**
 * End-user magic-link portal at /portal/sign-in.
 *
 * We don't validate that the email actually arrives (that would require
 * Resend live keys + an inbox poller). We only assert that:
 *   - the form is rendered
 *   - submitting it transitions the page to the "lien envoyé" confirmation
 *   - the confirmation displays the email used
 */
test.describe('Portal magic-link sign-in', () => {
  test('should render the email form on /portal/sign-in', async ({ page }) => {
    await page.goto('/portal/sign-in');
    await expect(page.getByRole('heading', { name: /accès portail/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /recevoir un lien de connexion/i })
    ).toBeVisible();
  });

  test('should show the confirmation screen after submitting a valid email', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/portal/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /recevoir un lien de connexion/i }).click();

    // The "Vérifiez votre email" screen replaces the form once the mutation succeeds.
    await expect(page.getByRole('heading', { name: /vérifiez votre email/i })).toBeVisible({
      timeout: 10_000,
    });

    // The confirmation copy contains the email the user entered.
    await expect(page.getByText(email)).toBeVisible({ timeout: 5_000 });

    // A "Renvoyer un lien" CTA is offered for retries.
    await expect(page.getByRole('button', { name: /renvoyer un lien/i })).toBeVisible();
  });

  test('should reject an empty email submission via native validation', async ({ page }) => {
    await page.goto('/portal/sign-in');

    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeVisible({ timeout: 5_000 });

    // The Input has `required`, so the browser will refuse to submit.
    await page.getByRole('button', { name: /recevoir un lien de connexion/i }).click();

    // We should still be on the sign-in page (no transition to confirmation).
    await expect(page.getByRole('heading', { name: /vérifiez votre email/i })).toBeHidden();
    await expect(emailInput).toBeFocused();
  });

  test('should be able to go back to the form via "Renvoyer un lien"', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/portal/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: /recevoir un lien de connexion/i }).click();

    await expect(page.getByRole('heading', { name: /vérifiez votre email/i })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: /renvoyer un lien/i }).click();
    // After clicking resend, the form is shown again.
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole('button', { name: /recevoir un lien de connexion/i })
    ).toBeVisible();
  });
});
