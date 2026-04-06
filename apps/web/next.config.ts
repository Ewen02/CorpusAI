import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['@corpusai/types', '@corpusai/subscription', '@corpusai/ui'],
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  telemetry: false,
  org: 'ewenlq',
  project: 'corpusai',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: false },
});
