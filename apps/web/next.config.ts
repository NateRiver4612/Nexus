import { createRequire } from 'node:module';

import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  transpilePackages: ['@nexus/types', '@nexus/zod-schemas'],
  webpack: (config) => {
    // The package feature-detects React.Activity; its ESM build gets statically
    // checked against React's server export map, where Activity is absent.
    config.resolve.alias['react-resizable-panels$'] =
      require.resolve('react-resizable-panels/dist/react-resizable-panels.cjs');
    return config;
  },
  output: 'standalone',
};

export default nextConfig;
