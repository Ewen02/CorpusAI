/**
 * Centralized route constants to avoid hardcoded paths.
 */

export const ROUTES = {
  // Auth
  signIn: '/sign-in',
  signUp: '/sign-up',

  // Dashboard
  dashboard: '/dashboard',

  // AIs
  ais: {
    list: '/ais',
    new: '/ais/new',
    detail: (id: string) => `/ais/${id}` as const,
    settings: (id: string) => `/ais/${id}/settings` as const,
    chat: (slug: string) => `/chat/${slug}` as const,
  },

  // Analytics
  analytics: '/analytics',

  // Settings
  settings: {
    root: '/settings',
    billing: '/settings/billing',
    security: '/settings/security',
    notifications: '/settings/notifications',
    apiKeys: '/settings/api-keys',
  },

  // External
  docs: 'https://docs.corpusai.com',
} as const;

/**
 * Type helper for route parameters.
 */
export type AIDetailRoute = ReturnType<typeof ROUTES.ais.detail>;
export type AISettingsRoute = ReturnType<typeof ROUTES.ais.settings>;
