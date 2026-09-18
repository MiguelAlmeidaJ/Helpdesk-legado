export function csvCell(value: string | number): string {
  const text = String(value);
  // Spreadsheet applications interpret these prefixes even in quoted cells.
  const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function duration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${Math.floor(minutes / 1440)}d ${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function reportError(reason: unknown): string {
  const error = reason as { status?: number; body?: { message?: unknown } };
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (error.status === 403) return 'Seu usuário não possui acesso a este relatório.';
  if (error.status === 400 && typeof error.body?.message === 'string') return error.body.message;
  return 'Não foi possível carregar o relatório. Tente novamente.';
}
