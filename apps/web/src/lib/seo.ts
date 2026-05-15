/**
 * Shared SEO helpers for `generateMetadata` in public routes.
 * Server-only — do not import from client components.
 */

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'http://localhost:3000';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const DEFAULT_OG_IMAGE = '/og-default.png';

/**
 * Build canonical absolute URL for a given path (with optional locale prefix).
 */
export function canonicalUrl(path: string, locale?: string): string {
  const base = APP_URL.replace(/\/$/, '');
  const localePrefix = locale && locale !== 'fr' ? `/${locale}` : '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${localePrefix}${normalizedPath}`;
}

/**
 * Fetch JSON from the API with ISR caching. Returns null on any error
 * so callers can fall back to default metadata without crashing the page.
 */
export async function fetchPublicJSON<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
