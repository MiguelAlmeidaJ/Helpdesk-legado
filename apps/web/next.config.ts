import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import { WEB_ROUTE_TRANSLATIONS } from '@helpdesk/contracts';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return WEB_ROUTE_TRANSLATIONS.map(([source, destination]) => ({
      source: `${source}/:path*`,
      destination: `${destination}/:path*`,
      permanent: true,
    }));
  },
  async rewrites() {
    return WEB_ROUTE_TRANSLATIONS.map(([destination, source]) => ({
      source: `${source}/:path*`,
      destination: `${destination}/:path*`,
    }));
  },
};

export default nextConfig;
