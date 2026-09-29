export const DEFAULT_WEB_ORIGINS = [
  'http://localhost:4204',
  'http://192.168.199.234',
  'http://192.168.199.234:4204',
  'https://helpdesk.nivel3ti.com.br',
] as const;

const FIXED_WEB_ORIGINS = new Set(
  DEFAULT_WEB_ORIGINS.map((origin) => origin.toLowerCase()),
);

export function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Retorna somente origens pertencentes à allowlist fixa da aplicação.
 *
 * WEB_ORIGIN pode restringir a lista para um ambiente específico, mas nunca
 * ampliar o CORS para hosts que não estejam declarados em DEFAULT_WEB_ORIGINS.
 */
export function allowedWebOrigins(raw?: string | null): Set<string> {
  if (!raw?.trim()) {
    return new Set(FIXED_WEB_ORIGINS);
  }

  const configured = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value))
    .filter((value) => FIXED_WEB_ORIGINS.has(value));

  return new Set(configured);
}
