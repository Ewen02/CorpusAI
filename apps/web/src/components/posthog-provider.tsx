'use client';

import * as React from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as BasePostHogProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Initializes PostHog once on the client and tracks route changes.
 *
 * Env vars (set on Vercel):
 * - NEXT_PUBLIC_POSTHOG_KEY: project API key starting with `phc_...`
 * - NEXT_PUBLIC_POSTHOG_HOST: usually `https://eu.i.posthog.com` (EU cloud)
 *   or `https://us.i.posthog.com` (US cloud)
 *
 * No-op when the key is missing, so local dev and preview deploys that
 * don't set the env var don't pollute the analytics project.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === 'undefined') return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: false, // we emit $pageview manually below to include route changes
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: false, // we rely on our typed track() helper
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug();
      },
    });
  }, []);

  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}

/**
 * Mount once in the root layout inside PostHogProvider to emit a $pageview
 * event on every client-side route change (Next.js app router does not fire
 * full page reloads on internal navigations).
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!pathname) return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    let url = window.origin + pathname;
    const query = searchParams?.toString();
    if (query) url += `?${query}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
