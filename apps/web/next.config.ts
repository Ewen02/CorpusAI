import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@corpusai/types', '@corpusai/subscription', '@corpusai/ui'],
};

export default nextConfig;
