import { BadRequestException, Body, Controller, Delete, Get, Header, Param, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AppPermission } from '@helpdesk/contracts';
import { LEGACY_SESSION_SECURITY } from '../../../../core/openapi/openapi.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';
import { CurrentUser } from '../../../access/presentation/http/current-user.decorator';
import { LegacySessionGuard } from '../../../access/presentation/http/legacy-session.guard';
import { PermissionsGuard } from '../../../access/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../access/presentation/http/require-permissions.decorator';
import { GetTicketAnalytics } from '../../application/get-ticket-analytics';
import { ReportArchiveRepository } from '../../application/ports/report-archive.repository';
import { analyticsPdf, reportZip } from '../../infrastructure/report-files';
import { analyticsFilters, reportUser } from './ticket-analytics.controller';

function filenames(body: unknown): string[] {
  const names = (body as { names?: unknown })?.names;
  if (!Array.isArray(names) || !names.length || names.length > 100 || names.some(name => typeof name !== 'string')) throw new BadRequestException('Selecione entre 1 e 100 arquivos.');
  return [...new Set(names)] as string[];
}

@ApiTags('reports')
@Controller('reports')
@UseGuards(LegacySessionGuard, PermissionsGuard)
@RequirePermissions(AppPermission.TicketsAudit)
@ApiSecurity(LEGACY_SESSION_SECURITY)
export class ReportArchiveController {
  constructor(private readonly archive: ReportArchiveRepository, private readonly reports: GetTicketAnalytics) {}

  @Get('tickets/analytics.pdf')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Baixar PDF do relatório analítico' })
  async pdf(@CurrentUser() user: AuthenticatedUser | undefined, @Query() query: Record<string, unknown>) {
    const report = await this.reports.analytics(reportUser(user), analyticsFilters(query));
    return new StreamableFile(analyticsPdf(report), { type: 'application/pdf', disposition: 'attachment; filename="relatorio.pdf"' });
  }

  @Get('archive')
  @ApiOperation({ summary: 'Listar PDFs arquivados' })
  async list(@CurrentUser() user: AuthenticatedUser | undefined) { await this.archive.authorize(reportUser(user)); return this.archive.list(); }

  @Get('archive/:name')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Baixar PDF arquivado' })
  async download(@CurrentUser() user: AuthenticatedUser | undefined, @Param('name') name: string) {
    await this.archive.authorize(reportUser(user));
    return new StreamableFile(await this.archive.read(name), { type: 'application/pdf', disposition: `attachment; filename="relatorio.pdf"; filename*=UTF-8''${encodeURIComponent(name)}` });
  }

  @Post('archive/download')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Baixar PDFs selecionados em ZIP' })
  async zip(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: unknown) {
    await this.archive.authorize(reportUser(user));
    const files = [];
    let size = 0;
    for (const name of filenames(body)) {
      const data = await this.archive.read(name); size += data.length;
      if (size > 100 * 1024 * 1024) throw new BadRequestException('Seleção acima de 100 MB. Reduza a quantidade de arquivos.');
      files.push({ name, data });
    }
    return new StreamableFile(reportZip(files), { type: 'application/zip', disposition: 'attachment; filename="relatorios.zip"' });
  }

  @Delete('archive')
  @ApiOperation({ summary: 'Excluir PDFs selecionados' })
  async remove(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: unknown) {
    await this.archive.authorize(reportUser(user));
    const names = filenames(body);
    // Validate the complete selection before the first deletion.
    for (const name of names) await this.archive.read(name);
    for (const name of names) await this.archive.remove(name);
    return { removed: names.length };
  }

  @Post('archive/generate')
  @ApiOperation({ summary: 'Gerar e arquivar relatório unificado por cliente' })
  async generate(@CurrentUser() user: AuthenticatedUser | undefined, @Body() body: Record<string, unknown>) {
    const userId = reportUser(user);
    await this.archive.authorize(userId);
    if (!body || !Array.isArray(body.clientIds) || !body.clientIds.length || body.clientIds.length > 50 || body.clientIds.some(id => typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException('Selecione entre 1 e 50 clientes.');
    const filters = analyticsFilters({ startDate: body.startDate, endDate: body.endDate, source: 'unified' });
    const allowed = new Set((await this.reports.catalog(userId, 0)).clients.map(row => row.id));
    const clientIds = [...new Set(body.clientIds as number[])];
    if (clientIds.some(id => !allowed.has(id))) throw new BadRequestException('Cliente inválido ou inativo.');
    const files = [];
    const errors: Array<{ clientId: number; message: string }> = [];
    for (const clientId of clientIds) {
      try {
        const report = await this.reports.analytics(userId, { ...filters, clientId });
        files.push(await this.archive.save(clientId, filters.startDate, filters.endDate, analyticsPdf(report)));
      } catch (error) { errors.push({ clientId, message: error instanceof BadRequestException ? error.message : 'Não foi possível gerar o PDF deste cliente.' }); }
    }
    return { files, errors };
  }
}
