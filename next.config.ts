import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Externalize native modules so they use standard node_modules path
  // instead of Next.js's hashed internal path
  serverExternalPackages: ['better-sqlite3'],
  // @ts-ignore
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingExcludes: {
    '*': ['**/*.db', '**/*.db-shm', '**/*.db-wal'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: false,
  },
};

export default nextConfig;
