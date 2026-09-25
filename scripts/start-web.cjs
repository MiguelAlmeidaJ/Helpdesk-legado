const path = require('node:path');
const { waitForApi } = require('./wait-for-api.cjs');

async function start() {
  const apiUrl = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ??
    'http://127.0.0.1:4004/api';

  console.log('[helpdesk-web] Aguardando API e bancos de dados...');
  await waitForApi(apiUrl);
  console.log('[helpdesk-web] API e bancos disponiveis. Iniciando interface.');

  // Run Next in this process so PM2 owns its lifecycle and receives its signals.
  require(require.resolve('next/dist/bin/next', {
    paths: [path.join(__dirname, '../apps/web')],
  }));
}

void start().catch((error) => {
  console.error(`[helpdesk-web] ${error.message}`);
  process.exitCode = 1;
});
