const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const apiPort = String(process.env.PORT || 4004);
const webPort = String(process.env.WEB_PORT || 4204);

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
        WEB_PUBLIC_URL: process.env.WEB_PUBLIC_URL,
        SWAGGER_ENABLED: process.env.SWAGGER_ENABLED,
        API_SESSION_COOKIE: process.env.API_SESSION_COOKIE,
        API_SESSION_TTL_DAYS: process.env.API_SESSION_TTL_DAYS,
        SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM,
        NIVEL3_DATABASE_URL: process.env.NIVEL3_DATABASE_URL,
        N3RD_DATABASE_URL: process.env.N3RD_DATABASE_URL,
        DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
        LEGACY_SESSION_COOKIE: process.env.LEGACY_SESSION_COOKIE,
        LEGACY_SESSION_PATH: process.env.LEGACY_SESSION_PATH,
      }),
    },
    {
      name: 'helpdesk-ticket-worker',
      cwd: root,
      script: path.join(root, 'apps/api/dist/worker.js'),
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '384M',
      env: definedEnv({
        NODE_ENV: 'production',
        NIVEL3_DATABASE_URL: process.env.NIVEL3_DATABASE_URL,
        N3RD_DATABASE_URL: process.env.N3RD_DATABASE_URL,
        DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT,
        WEB_PUBLIC_URL: process.env.WEB_PUBLIC_URL,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM,
        TICKET_NOTIFICATION_EMAIL_ENABLED:
          process.env.TICKET_NOTIFICATION_EMAIL_ENABLED ?? 'false',
        TICKET_NOTIFICATION_EMAIL_INTERVAL_MS:
          process.env.TICKET_NOTIFICATION_EMAIL_INTERVAL_MS ?? '30000',
        TICKET_NOTIFICATION_EMAIL_BATCH_SIZE:
          process.env.TICKET_NOTIFICATION_EMAIL_BATCH_SIZE ?? '50',
        TICKET_HOLD_AUTO_RESUME_ENABLED:
          process.env.TICKET_HOLD_AUTO_RESUME_ENABLED ?? 'true',
        TICKET_HOLD_AUTO_RESUME_INTERVAL_MS:
          process.env.TICKET_HOLD_AUTO_RESUME_INTERVAL_MS ?? '60000',
        TICKET_HOLD_AUTO_RESUME_BATCH_SIZE:
          process.env.TICKET_HOLD_AUTO_RESUME_BATCH_SIZE ?? '100',
        TICKET_SCHEDULED_ACTIVATION_ENABLED:
          process.env.TICKET_SCHEDULED_ACTIVATION_ENABLED ?? 'true',
        TICKET_SCHEDULED_ACTIVATION_INTERVAL_MS:
          process.env.TICKET_SCHEDULED_ACTIVATION_INTERVAL_MS ?? '60000',
        TICKET_SCHEDULED_ACTIVATION_BATCH_SIZE:
          process.env.TICKET_SCHEDULED_ACTIVATION_BATCH_SIZE ?? '100',
        TICKET_RECURRENCE_ENABLED:
          process.env.TICKET_RECURRENCE_ENABLED ?? 'true',
        TICKET_RECURRENCE_INTERVAL_MS:
          process.env.TICKET_RECURRENCE_INTERVAL_MS ?? '60000',
        TICKET_RECURRENCE_BATCH_SIZE:
          process.env.TICKET_RECURRENCE_BATCH_SIZE ?? '100',
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
