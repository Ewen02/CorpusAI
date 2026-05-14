import type { APIRequestContext, BrowserContext } from '@playwright/test';
import { API_URL } from './test-data';

export interface CreatedAIResponse {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  primaryColor?: string | null;
}

export interface CreateAIInput {
  name: string;
  slug: string;
  description?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  isPublic?: boolean;
  accessType?: 'FREE' | 'PRIVATE' | 'PAID';
  language?: 'fr' | 'en';
}

/**
 * Create an AI via the authenticated API.
 *
 * The Better Auth session cookie is automatically forwarded by Playwright's
 * `APIRequestContext` because it lives on the same `BrowserContext` storage state.
 *
 * @param request - APIRequestContext that already carries the auth cookies
 * @param input - AI creation payload
 */
export async function createAIViaAPI(
  request: APIRequestContext,
  input: CreateAIInput
): Promise<CreatedAIResponse> {
  const response = await request.post(`${API_URL}/ais`, {
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      systemPrompt: input.systemPrompt,
      welcomeMessage: input.welcomeMessage,
      isPublic: input.isPublic ?? true,
      accessType: input.accessType ?? 'FREE',
      language: input.language ?? 'fr',
    },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create AI: ${response.status()} ${await response.text()}`);
  }

  return (await response.json()) as CreatedAIResponse;
}

/**
 * Set an access code on an AI (switches it into GATED-by-code mode).
 */
export async function setAccessCode(
  request: APIRequestContext,
  aiId: string,
  code: string
): Promise<void> {
  const response = await request.post(`${API_URL}/ais/${aiId}/access/code`, {
    data: { code },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    throw new Error(`Failed to set access code: ${response.status()} ${await response.text()}`);
  }
}

/**
 * Toggle invite-only mode on an AI.
 */
export async function setInviteOnly(
  request: APIRequestContext,
  aiId: string,
  inviteOnly: boolean
): Promise<void> {
  const response = await request.patch(`${API_URL}/ais/${aiId}/access/invite`, {
    data: { inviteOnly },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok()) {
    throw new Error(
      `Failed to set invite-only mode: ${response.status()} ${await response.text()}`
    );
  }
}

/**
 * Build an `APIRequestContext` that reuses the cookies from a page's
 * `BrowserContext`. Useful when we want to call backend endpoints from a
 * test that already authenticated through the UI.
 *
 * Playwright's `page.request` already does this — this helper just exposes
 * an explicit name for readability.
 */
export function authedRequest(context: BrowserContext): APIRequestContext {
  return context.request;
}
