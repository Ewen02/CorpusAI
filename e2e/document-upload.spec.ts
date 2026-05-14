import { expect } from '@playwright/test';
import { test } from './fixtures/auth';
import { createAIViaAPI } from './fixtures/ai';
import { uniqueAIName } from './fixtures/test-data';

/**
 * Upload a small `.txt` file onto a fresh AI and assert that it appears
 * with a PENDING / PROCESSING status. We don't wait for INDEXED because
 * that requires the ai-worker and OpenAI/Mistral keys to be live.
 */
test.describe('Document upload (authenticated)', () => {
  test('should upload a .txt file and display it in the documents tab', async ({
    authenticatedPage: page,
  }) => {
    // Create the AI via API so the test stays fast and deterministic.
    const aiName = uniqueAIName();
    const slug = `e2e-${Date.now().toString(36)}`;
    const ai = await createAIViaAPI(page.request, { name: aiName, slug });

    // Navigate to the AI detail page (Documents tab).
    await page.goto(`/ais/${ai.id}`);
    await page.getByRole('tab', { name: /documents/i }).click();

    // The DocumentUploader exposes a hidden <input type="file"> — locate it directly
    // so we can drive it via setInputFiles, which is the Playwright-recommended way.
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached({ timeout: 5_000 });

    const filename = `e2e-upload-${Date.now()}.txt`;
    await fileInput.setInputFiles({
      name: filename,
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'This is an end-to-end test document.\nIt has a couple of short paragraphs so the chunker has something to do.',
        'utf-8'
      ),
    });

    // Once uploaded, the file appears in the list. Status is either PENDING or PROCESSING.
    await expect(page.getByText(filename)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/en attente|traitement|processing|pending/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('should show the empty state before any document is uploaded', async ({
    authenticatedPage: page,
  }) => {
    const aiName = uniqueAIName();
    const slug = `e2e-empty-${Date.now().toString(36)}`;
    const ai = await createAIViaAPI(page.request, { name: aiName, slug });

    await page.goto(`/ais/${ai.id}`);
    await page.getByRole('tab', { name: /documents/i }).click();

    await expect(page.getByText(/aucun document|importez vos fichiers/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
