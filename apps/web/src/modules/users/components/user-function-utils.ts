import { ApiError } from '../../../shared/api/api-client';

export function functionApiMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = (error.body as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return error instanceof ApiError ? `A API respondeu com erro ${error.status}.` : 'Não foi possível concluir a operação. Tente novamente.';
}

export function userInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words.at(-1)?.[0] ?? '' : '')).toLocaleUpperCase('pt-BR');
}
