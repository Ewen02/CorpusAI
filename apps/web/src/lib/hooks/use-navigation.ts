'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { ROUTES } from '@/lib/constants';

/**
 * Centralized navigation hook to avoid duplicated navigation logic.
 * Provides type-safe navigation functions for common routes.
 */
export function useNavigation() {
  const router = useRouter();

  const navigateTo = useCallback(
    (href: string) => {
      if (href.startsWith('http')) {
        window.open(href, '_blank');
      } else {
        router.push(href);
      }
    },
    [router]
  );

  const goToAIList = useCallback(() => {
    router.push(ROUTES.ais.list);
  }, [router]);

  const goToAI = useCallback(
    (id: string) => {
      router.push(ROUTES.ais.detail(id));
    },
    [router]
  );

  const goToAISettings = useCallback(
    (id: string) => {
      router.push(ROUTES.ais.settings(id));
    },
    [router]
  );

  const goToCreateAI = useCallback(() => {
    router.push(ROUTES.ais.new);
  }, [router]);

  const goToDashboard = useCallback(() => {
    router.push(ROUTES.dashboard);
  }, [router]);

  const goToSettings = useCallback(() => {
    router.push(ROUTES.settings.root);
  }, [router]);

  const goToBilling = useCallback(() => {
    router.push(ROUTES.settings.billing);
  }, [router]);

  const goToSignIn = useCallback(() => {
    router.push(ROUTES.signIn);
  }, [router]);

  return {
    navigateTo,
    goToAIList,
    goToAI,
    goToAISettings,
    goToCreateAI,
    goToDashboard,
    goToSettings,
    goToBilling,
    goToSignIn,
    router,
  };
}
