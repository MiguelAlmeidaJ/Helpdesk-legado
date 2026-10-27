import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppPermission, PermissionScope, Sector, type MediaContext } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { TicketTypeAccessRepository } from '../../tickets/application/ports/ticket-type-access.repository';
import { mediaContext } from './media-validation';

export function mediaAdmin(user: AuthenticatedUser): boolean {
  return user.grants.some(grant => grant.permission === AppPermission.SystemAdmin);
}
export function requireMediaAdmin(user: AuthenticatedUser): void {
  if (!mediaAdmin(user)) throw new ForbiddenException('Acesso administrativo necessário.');
}
@Injectable()
export class MediaAccess {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient, private readonly typeAccess: TicketTypeAccessRepository) {}

  async assert(user: AuthenticatedUser, input: MediaContext, write = false): Promise<void> {
    const context = mediaContext(input.type,input.id);
    if (context.type === 'system') { requireMediaAdmin(user); return; }
    const catalog = context.type === 'catalog';
    const table = catalog ? 'catalogos' : context.type === 'ticket' ? 'atendimentos' : context.type === 'project' ? 'projetos' : 'tarefas';
    const fields = catalog ? 'id,cliente_id AS client_id,usuario_id AS owner_id,setor AS sector_id' : 'id,cliente AS client_id,tecnico AS owner_id,area AS sector_id,desc_abertura,desc_fechamento';
    const rows = await this.database.$queryRawUnsafe<Array<{ id: number; client_id: number | null; owner_id: number | null; sector_id: number | null; desc_abertura?: string; desc_fechamento?: string }>>(`SELECT TOP (1) ${fields} FROM dbo.${table} WHERE id=@P1${catalog ? ' AND arquivado_em IS NULL' : ''}`, Number(context.id));
    const record = rows[0];
    if (!record) throw new NotFoundException('Registro não encontrado ou fora do seu escopo.');
    if (mediaAdmin(user)) return;
    let own = false;
    if (catalog) {
      const permission = record.sector_id === 1
        ? (write ? AppPermission.CatalogTiEdit : AppPermission.CatalogTiRead)
        : (write ? AppPermission.CatalogDevOpsEdit : AppPermission.CatalogDevOpsRead);
      const grant = user.grants.find(g => g.permission === AppPermission.CatalogManage) ?? user.grants.find(g => g.permission === permission)
        ?? (!write ? user.grants.find(g => g.permission === (record.sector_id === 1 ? AppPermission.CatalogTiEdit : AppPermission.CatalogDevOpsEdit)) : undefined);
      if (!grant || ![1,2].includes(record.sector_id ?? 0)) throw new ForbiddenException('Sem permissão para este catálogo.');
      own = grant.scope === PermissionScope.Own;
      // Sector catalog grants are narrowed by the selected sector-specific permission.
    } else {
      const sector = context.type === 'ticket' ? Sector.IT : Sector.DevOps;
      const snapshot = await this.typeAccess.findByUserId(user.id);
      const access = snapshot.permissions[sector];
      if (!snapshot.sectors.includes(sector) || !access?.read) throw new ForbiddenException('Sem acesso ao módulo deste registro.');
      const permission = context.type === 'ticket' ? (write ? AppPermission.TicketsExecute : AppPermission.TicketsRead)
        : context.type === 'project' ? (write ? AppPermission.DevOpsProjectsEdit : AppPermission.DevOpsProjectsRead)
        : (write ? AppPermission.DevOpsTasksEdit : AppPermission.DevOpsTasksRead);
      const grant = user.grants.find(g => g.permission === permission);
      if (context.type !== 'ticket' && !grant) throw new ForbiddenException('Permissão de projeto/tarefa necessária.');
      if (grant?.scope === PermissionScope.Sector) throw new ForbiddenException('O escopo de setor deste módulo ainda não está configurado.');
      if (write && !(access.execute || access.edit || access.manageOthers)) throw new ForbiddenException('Sem permissão para alterar mídias deste registro.');
      own = grant?.scope === PermissionScope.Own || (context.type === 'ticket' && user.grants.some(g=>g.permission===AppPermission.TicketsRead && g.scope===PermissionScope.Own)) || (write && !access.manageOthers);
    }
    if (write) {
      const readPermission = catalog ? (record.sector_id === 1 ? AppPermission.CatalogTiRead : AppPermission.CatalogDevOpsRead)
        : context.type === 'ticket' ? AppPermission.TicketsRead : context.type === 'project' ? AppPermission.DevOpsProjectsRead : AppPermission.DevOpsTasksRead;
      const readGrant = user.grants.find(g=>g.permission===readPermission);
      if (!catalog && context.type !== 'ticket' && !readGrant) throw new ForbiddenException('Permissão de leitura do módulo necessária.');
      if (!catalog && readGrant?.scope === PermissionScope.Sector) throw new ForbiddenException('O escopo de setor deste módulo ainda não está configurado.');
      if (readGrant?.scope === PermissionScope.Own) own = true;
    }
    if (own && record.owner_id !== user.id) throw new NotFoundException('Registro não encontrado ou fora do seu escopo.');
    const [actor] = await this.database.$queryRawUnsafe<Array<{ tipo_usuario: number }>>('SELECT tipo_usuario FROM dbo.usuarios WHERE user_id=@P1',user.id);
    if (!actor) throw new ForbiddenException('Usuário indisponível.');
    if (actor.tipo_usuario === 2) {
      const clients = await this.database.$queryRawUnsafe<Array<{ cliente_id: number }>>('SELECT cliente_id FROM dbo.clientes_usuarios WHERE usuario_id=@P1 AND cliente_id=@P2',user.id,record.client_id);
      if (!clients.length) throw new NotFoundException('Registro não encontrado ou fora do seu escopo.');
    }
    // Preserve the existing restricted-account visibility rule without exposing record content.
    if (user.id === 134 && !catalog) {
      const [client] = await this.database.$queryRawUnsafe<Array<{ clt_nomef: string }>>('SELECT clt_nomef FROM dbo.clientes WHERE clt_id=@P1',record.client_id);
      if (!/NET DO BRASIL/i.test([record.desc_abertura,record.desc_fechamento,client?.clt_nomef].join(' '))) throw new NotFoundException('Registro não encontrado ou fora do seu escopo.');
    }
  }
}
