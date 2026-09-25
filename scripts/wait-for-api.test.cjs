const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { test } = require('node:test');
const { waitForApi } = require('./wait-for-api.cjs');

const healthy = { status: 'ok', databases: { nivel3: 'up' } };

async function serve(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}/api`;
}

test('waits through unavailable and degraded responses before releasing startup', async (t) => {
  let requests = 0;
  const apiUrl = await serve(t, (req, res) => {
    assert.equal(req.url, '/api/health');
    requests++;
    if (requests === 1) {
      res.writeHead(503).end('starting');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(requests === 2
        ? { status: 'degraded', databases: { nivel3: 'down' } }
        : healthy));
    }
  });
  await waitForApi(`${apiUrl}/`, { timeoutMs: 3000, intervalMs: 10 });
  assert.equal(requests, 3);
});

test('retries a refused connection until the API starts listening', async (t) => {
  const server = createServer((req, res) => res.end(JSON.stringify(healthy)));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const timer = setTimeout(() => server.listen(port, '127.0.0.1'), 100);
  t.after(() => {
    clearTimeout(timer);
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  await waitForApi(`http://127.0.0.1:${port}/api`, { timeoutMs: 3000, intervalMs: 10 });
  assert.equal(server.listening, true);
});

test('fails within the deadline when health requests hang', async (t) => {
  const apiUrl = await serve(t, () => {});
  await assert.rejects(
    waitForApi(apiUrl, { timeoutMs: 150, intervalMs: 10 }),
    /API ou bancos indisponiveis/,
  );
});
