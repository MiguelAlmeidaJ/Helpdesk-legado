import { cookies } from 'next/headers';

const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:4004/api';

function internalApiUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_INTERNAL_API_URL
  ).replace(/\/$/, '');
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> },
): Promise<Response> {
  const { imageId } = await context.params;
  if (!/^\d+$/.test(imageId)) {
    return new Response('Imagem inválida.', { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');

  const upstream = await fetch(
    `${internalApiUrl()}/catalog/images/${imageId}/content`,
    {
      cache: 'no-store',
      headers: {
        Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*',
        Cookie: cookieHeader,
      },
    },
  );

  if (!upstream.ok) {
    return new Response(
      upstream.status === 404
        ? 'Imagem não encontrada.'
        : 'Não foi possível abrir a imagem.',
      {
        status: upstream.status,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
