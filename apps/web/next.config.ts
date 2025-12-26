import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@corpusai/types', '@corpusai/subscription'],
};

export default nextConfig;
