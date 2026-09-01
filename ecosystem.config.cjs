const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const apiPort = String(process.env.PORT || 3001);
const webPort = String(process.env.WEB_PORT || 3000);

function definedEnv(values) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

module.exports = {
  apps: [
    {
      name: 'helpdesk-api',
      cwd: root,
      script: path.join(root, 'apps/api/dist/main.js'),
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: definedEnv({
        NODE_ENV: 'production',
        PORT: apiPort,
        WEB_ORIGIN: process.env.WEB_ORIGIN,
        SWAGGER_ENABLED: process.env.SWAGGER_ENABLED,
        API_SESSION_COOKIE: process.env.API_SESSION_COOKIE,
        API_SESSION_TTL_DAYS: process.env.API_SESSION_TTL_DAYS,
        SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
        NIVEL3_DATABASE_URL: process.env.NIVEL3_DATABASE_URL,
        N3RD_DATABASE_URL: process.env.N3RD_DATABASE_URL,
        DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
        LEGACY_SESSION_COOKIE: process.env.LEGACY_SESSION_COOKIE,
        LEGACY_SESSION_PATH: process.env.LEGACY_SESSION_PATH,
      }),
    },
    {
      name: 'helpdesk-web',
      cwd: path.join(root, 'apps/web'),
      script: path.join(root, 'apps/web/node_modules/next/dist/bin/next'),
      args: ['start', '-p', webPort],
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '768M',
      env: definedEnv({
        NODE_ENV: 'production',
        PORT: webPort,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        API_INTERNAL_URL: process.env.API_INTERNAL_URL,
      }),
    },
  ],
};
