import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@corpusai/types', '@corpusai/subscription', '@corpusai/ui'],
  experimental: {
    turbo: {},
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  org: 'ewenlq',
  project: 'corpusai',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: false },
});
