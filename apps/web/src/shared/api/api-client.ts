const DEFAULT_API_URL = 'http://localhost:4004/api';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);

  headers.set('Accept', 'application/json');

  if (!SAFE_METHODS.has(method)) {
    headers.set('X-Helpdesk-Request', 'browser');
  }

  const response = await fetch(
    `${apiBaseUrl()}/${path.replace(/^\//, '')}`,
    {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
    },
  );

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    throw new ApiError(response.status, body);
  }
  return body as T;
}
