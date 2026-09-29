export const DEFAULT_WEB_ORIGINS = [
  'http://localhost:4204',
  'http://192.168.199.234',
  'http://192.168.199.234:4204',
  'https://helpdesk.nivel3ti.com.br',
] as const;

export function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function allowedWebOrigins(raw?: string | null): Set<string> {
  const values =
    raw?.trim()
      ? raw.split(',')
      : [...DEFAULT_WEB_ORIGINS];

  return new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean)
      .map(normalizeOrigin)
      .filter((value): value is string => Boolean(value)),
  );
}
