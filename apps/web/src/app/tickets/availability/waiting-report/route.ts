import { cookies } from 'next/headers';

const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:4004/api';

function internalApiUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_INTERNAL_API_URL
  ).replace(/\/$/, '');
}

export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  const upstream = await fetch(
    `${internalApiUrl()}/tickets/availability/waiting-report.pdf`,
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/pdf',
        Cookie: cookieHeader,
      },
    },
  );

  if (!upstream.ok) {
    return new Response(
      upstream.status === 403
        ? 'Sem permissão para gerar o relatório.'
        : 'Não foi possível gerar o relatório.',
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ??
        'attachment; filename="relatorio_atendimentos_em_espera.pdf"',
    },
  });
}
