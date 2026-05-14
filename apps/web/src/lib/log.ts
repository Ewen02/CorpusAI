import * as Sentry from '@sentry/nextjs';

/**
 * Report a client-side error.
 *
 * - In production: forwards to Sentry (with the optional context as `extra`).
 * - In development: logs to console so devs see it during local work.
 *
 * Use this instead of `console.error` so production telemetry stays clean and
 * errors are aggregated by Sentry instead of swallowed by the browser console.
 */
export function reportError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: { message, ...context } });
  } else {
    console.error(`[client] ${message}`, error, context ?? '');
  }
}
