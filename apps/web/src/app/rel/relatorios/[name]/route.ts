import { cookies } from 'next/headers';

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const cookieStore = await cookies();
  const base = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4004/api').replace(/\/$/, '');
  const upstream = await fetch(`${base}/reports/archive/${encodeURIComponent(name)}`, {
    cache: 'no-store', headers: { Cookie: cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; '), Accept: 'application/pdf' },
  });
  if (!upstream.ok) return new Response('Não foi possível acessar este relatório.', { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
  return new Response(upstream.body, { headers: {
    'Cache-Control': 'no-store', 'Content-Type': 'application/pdf',
    'Content-Disposition': upstream.headers.get('content-disposition') ?? 'attachment; filename="relatorio.pdf"',
  } });
}
