import { legacyReportDestination } from '../../../modules/reports/lib/legacy-report-route';

export async function GET(request: Request, context: { params: Promise<{ legacy: string }> }) {
  const { legacy } = await context.params;
  const url = new URL(request.url);
  const destination = legacyReportDestination(legacy, url.searchParams);
  if (!destination) return new Response('Recurso legado aposentado. Acesse /reports/archive ou /reports/tickets/analytics.', { status: 410 });
  return Response.redirect(new URL(destination, url.origin), 302);
}

export function POST() { return new Response('Use as operações da aplicação atual.', { status: 410 }); }
