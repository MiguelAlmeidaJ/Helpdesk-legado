import { cookies } from 'next/headers';

const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:3001/api';

function internalApiUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_INTERNAL_API_URL
  ).replace(/\/$/, '');
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      expenseId: string;
      attachmentKey: string;
    }>;
  },
): Promise<Response> {
  const { expenseId, attachmentKey } = await context.params;
  if (
    !/^\d+$/.test(expenseId) ||
    !/^(?:legacy-\d+|[0-9a-f-]{36})$/i.test(attachmentKey)
  ) {
    return new Response('Anexo inválido.', { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  const upstream = await fetch(
    `${internalApiUrl()}/logistics/expenses/${expenseId}/attachments/${encodeURIComponent(attachmentKey)}/content`,
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
      upstream.status === 404
        ? 'Comprovante não encontrado.'
        : 'Não foi possível abrir o comprovante.',
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ??
        'inline; filename="comprovante.pdf"',
    },
  });
}
