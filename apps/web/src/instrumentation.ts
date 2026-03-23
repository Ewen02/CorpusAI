export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      initialScope: { tags: { app: 'web' } },
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      initialScope: { tags: { app: 'web' } },
    });
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string }
) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import('@sentry/nextjs');
  captureRequestError(err, request, context);
};
