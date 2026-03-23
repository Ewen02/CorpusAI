import * as Sentry from '@sentry/nestjs';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.prismaIntegration()],
    initialScope: { tags: { app: 'api' } },
  });
}

export { Sentry };
