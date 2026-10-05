import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import { WEB_ROUTE_TRANSLATIONS } from '@helpdesk/contracts';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const internalApiBaseUrl = (
  process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4004/api'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return WEB_ROUTE_TRANSLATIONS
      .filter(([source, destination]) => source !== destination)
      .map(([source, destination]) => ({
        source: `${source}/:path*`,
        destination: `${destination}/:path*`,
        permanent: true,
      }));
  },
  async rewrites() {
    const routeTranslations = WEB_ROUTE_TRANSLATIONS
      .filter(([destination, source]) => destination !== source)
      .map(([destination, source]) => ({
        source: `${source}/:path*`,
        destination: `${destination}/:path*`,
      }));

    return [
      {
        source: '/api/:path*',
        destination: `${internalApiBaseUrl}/:path*`,
      },
      ...routeTranslations,
    ];
  },
};

export default nextConfig;
