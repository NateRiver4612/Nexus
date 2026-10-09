import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nexus/types', '@nexus/zod-schemas'],
  output: 'standalone',
};

export default nextConfig;
