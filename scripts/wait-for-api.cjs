const { setTimeout: delay } = require('node:timers/promises');

async function waitForApi(apiUrl, { timeoutMs = 120000, intervalMs = 1000 } = {}) {
  const healthUrl = `${apiUrl.replace(/\/$/, '')}/health`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(Math.max(1, Math.min(5000, deadline - Date.now()))),
        redirect: 'error',
      });
      const health = await response.json();
      if (
        response.ok &&
        health.status === 'ok' &&
        health.databases?.nivel3 === 'up' &&
        health.databases?.n3rd === 'up'
      ) {
        return;
      }
    } catch {
      // Connection refusal and timeouts are expected while the API starts.
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs > 0) await delay(Math.min(intervalMs, remainingMs));
  }

  throw new Error('API ou bancos indisponiveis apos aguardar a inicializacao. Verifique helpdesk-api e o banco de dados.');
}

module.exports = { waitForApi };
