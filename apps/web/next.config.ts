import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
