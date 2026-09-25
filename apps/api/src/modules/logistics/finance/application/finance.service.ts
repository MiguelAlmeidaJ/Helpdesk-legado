import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppPermission,
  type FinanceCatalogOption,
  type FinanceCatalogsResponse,
  type FinanceListResponse,
  type FinancePaymentInput,
  type FinancePayableWriteInput,
  type FinanceReceiptInput,
  type FinanceReceivableWriteInput,
  type FinanceRecurringWriteInput,
  type FinanceRow,
  type FinanceViewKey,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../../core/database/database.constants';
import type { AuthenticatedUser } from '../../../access/domain/authenticated-user';

type Row = Record<string, unknown>;

const VIEWS: FinanceViewKey[] = [
  'receivables-accrual',
  'receivables-cashflow',
  'payables',
  'entries',
  'recurring',
  'accounting',
  'statements',
];

function has(user: AuthenticatedUser, permission: AppPermission): boolean {
  return user.grants.some(
    (grant) =>
      grant.permission === AppPermission.SystemAdmin ||
      grant.permission === permission,
  );
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown, max = 255, required = false): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (required && !normalized) {
    throw new BadRequestException('Campo obrigatório não informado.');
  }
  if (normalized.length > max) {
    throw new BadRequestException(`Texto deve ter no máximo ${max} caracteres.`);
  }
  return normalized;
}

function positiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException(`${field} é inválido.`);
  }
  return value;
}

function optionalPositiveInt(value: unknown): number | null {
  if (value === undefined || value === null || value === 0) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BadRequestException('Identificador opcional inválido.');
  }
  return value;
}

function money(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BadRequestException(`${field} deve ser maior que zero.`);
  }
  return Math.round(value * 100) / 100;
}

function percent(value: unknown): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  if (parsed < 0 || parsed > 100) {
    throw new BadRequestException('Percentual deve ficar entre 0 e 100.');
  }
  return Math.round(parsed);
}

function date(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${field} deve usar YYYY-MM-DD.`);
  }
  return value;
}

function isoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const source = String(value);
  return source.slice(0, 10);
}

function normalizedView(value: string): FinanceViewKey {
  if (!VIEWS.includes(value as FinanceViewKey)) {
    throw new NotFoundException('Visão financeira não encontrada.');
  }
  return value as FinanceViewKey;
}

@Injectable()
export class FinanceService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async list(
    user: AuthenticatedUser,
    viewValue: string,
    startDate: string,
    endDate: string,
    search = '',
  ): Promise<FinanceListResponse> {
    const view = normalizedView(viewValue);
    this.assertRead(user, view);
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR').slice(0, 120);

    let rows =
      view === 'receivables-accrual'
        ? await this.receivables(startDate, endDate)
        : view === 'receivables-cashflow'
          ? await this.cashflow(startDate, endDate)
          : view === 'payables'
            ? await this.payables(startDate, endDate)
            : view === 'recurring'
              ? await this.recurring()
              : view === 'entries'
                ? await this.entries(startDate, endDate)
                : await this.ledger(startDate, endDate);

    if (normalizedSearch) {
      rows = rows.filter((row) =>
        [
          row.party,
          row.description,
          row.status,
          row.unit,
          row.group,
          row.subgroup,
          row.classification,
          row.documentType,
          row.observation,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch),
      );
    }

    return {
      view,
      period: { startDate, endDate },
      canManage: this.canManage(user, view),
      summary: this.summary(rows),
      rows,
    };
  }

  async catalogs(user: AuthenticatedUser): Promise<FinanceCatalogsResponse> {
    if (
      !has(user, AppPermission.LogisticsExpensesAdminRead) &&
      !has(user, AppPermission.LogisticsExpensesAdminManage)
    ) {
      throw new ForbiddenException('Usuário sem acesso aos cadastros financeiros.');
    }

    const [clients, units, groups, subgroups, classifications, documentTypes, agencies] =
      await Promise.all([
        this.database.$queryRawUnsafe<Row[]>(
          `SELECT clt_id AS id, COALESCE(NULLIF(clt_nomef, ''), clt_nomer) AS name
           FROM clientes WHERE clt_sts = 1 ORDER BY name`,
        ),
        this.database.$queryRawUnsafe<Row[]>(
          'SELECT id, nome_unid AS name FROM unidade_negocio WHERE sts_unid = 1 ORDER BY nome_unid',
        ),
        this.database.$queryRawUnsafe<Row[]>(
          'SELECT id, nome AS name FROM categorias_grupo WHERE status = 1 ORDER BY nome',
        ),
        this.database.$queryRawUnsafe<Row[]>(
          'SELECT id, nome AS name, id_grupo AS parent_id FROM categorias_subgrupo WHERE status = 1 ORDER BY nome',
        ),
        this.database.$queryRawUnsafe<Row[]>(
          'SELECT id, nome AS name FROM categorias_classificacao WHERE status = 1 ORDER BY nome',
        ),
        this.database.$queryRawUnsafe<Row[]>(
          'SELECT id, nome AS name FROM categorias_tipo_documento WHERE status = 1 ORDER BY nome',
        ),
        this.database.$queryRawUnsafe<Row[]>(
          'SELECT id, ag_nome AS name FROM agenciasbancarias WHERE COALESCE(status, 1) = 1 ORDER BY id',
        ),
      ]);

    const map = (items: Row[]): FinanceCatalogOption[] =>
      items.map((row) => ({
        id: number(row.id),
        name: String(row.name ?? `#${row.id}`),
        ...(row.parent_id !== undefined
          ? { parentId: number(row.parent_id) || null }
          : {}),
      }));

    return {
      clients: map(clients),
      units: map(units),
      groups: map(groups),
      subgroups: map(subgroups),
      classifications: map(classifications),
      documentTypes: map(documentTypes),
      agencies: map(agencies),
    };
  }

  async createReceivable(
    user: AuthenticatedUser,
    input: FinanceReceivableWriteInput,
  ): Promise<{ id: number }> {
    this.assertManage(user);
    const data = this.receivableInput(input);
    const id = await this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO contas_receber (
           id_cliente, descricao, valor_total, saldo, unidade_negocio,
           id_grupo, id_subgrupo, id_classificacao, id_tipo_documento,
           data_vencimento, id_usuario, status_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        data.clientId,
        data.description,
        data.amount,
        data.amount,
        data.unitId,
        data.groupId,
        data.subgroupId,
        data.classificationId,
        data.documentTypeId,
        data.dueDate,
        user.id,
      );
      const ids = await tx.$queryRawUnsafe<Array<{ id: number | bigint | string }>>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      const createdId = Number(ids[0]?.id);
      if (!Number.isSafeInteger(createdId) || createdId < 1) {
        throw new BadRequestException('Não foi possível identificar a conta criada.');
      }
      await tx.$executeRawUnsafe(
        `INSERT INTO contas_receber_divisao
          (id_conta_receber, percentual_ti, percentual_devops, percentual_marketing)
         VALUES (?, ?, ?, ?)`,
        createdId,
        data.percentTi,
        data.percentDevops,
        data.percentMarketing,
      );
      return createdId;
    });
    return { id };
  }

  async updateReceivable(
    user: AuthenticatedUser,
    id: number,
    input: FinanceReceivableWriteInput,
  ): Promise<void> {
    this.assertManage(user);
    const data = this.receivableInput(input);
    await this.database.$transaction(async (tx) => {
      const received = await tx.$queryRawUnsafe<Array<{ total: number | string | null }>>(
        'SELECT COALESCE(SUM(valor_recebido), 0) AS total FROM recebimentos WHERE id_conta_receber = ?',
        id,
      );
      const totalReceived = number(received[0]?.total);
      const balance = Math.max(0, data.amount - totalReceived);
      const statusId = this.receivableStatus(totalReceived, data.amount, data.dueDate);
      const changed = await tx.$executeRawUnsafe(
        `UPDATE contas_receber
         SET id_cliente=?, descricao=?, valor_total=?, saldo=?, unidade_negocio=?,
             id_grupo=?, id_subgrupo=?, id_classificacao=?, id_tipo_documento=?,
             data_vencimento=?, id_usuario=?, status_id=?
         WHERE id=?`,
        data.clientId,
        data.description,
        data.amount,
        balance,
        data.unitId,
        data.groupId,
        data.subgroupId,
        data.classificationId,
        data.documentTypeId,
        data.dueDate,
        user.id,
        statusId,
        id,
      );
      if (!changed) throw new NotFoundException('Conta a receber não encontrada.');
      await tx.$executeRawUnsafe(
        `INSERT INTO contas_receber_divisao
          (id_conta_receber, percentual_ti, percentual_devops, percentual_marketing)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           percentual_ti=VALUES(percentual_ti),
           percentual_devops=VALUES(percentual_devops),
           percentual_marketing=VALUES(percentual_marketing)`,
        id,
        data.percentTi,
        data.percentDevops,
        data.percentMarketing,
      );
    });
  }

  async receive(
    user: AuthenticatedUser,
    id: number,
    input: FinanceReceiptInput,
  ): Promise<void> {
    this.assertManage(user);
    const amount = money(input.amount, 'amount');
    const receivedAt = date(input.date, 'date');
    const agencyId = positiveInt(input.agencyId, 'agencyId');
    const observation = text(input.observation, 10_000);

    await this.database.$transaction(async (tx) => {
      const accounts = await tx.$queryRawUnsafe<
        Array<{ valor_total: number | string; data_vencimento: Date | string }>
      >(
        'SELECT valor_total, data_vencimento FROM contas_receber WHERE id=? LIMIT 1 FOR UPDATE',
        id,
      );
      const account = accounts[0];
      if (!account) throw new NotFoundException('Conta a receber não encontrada.');

      await tx.$executeRawUnsafe(
        `INSERT INTO recebimentos
          (id_conta_receber, valor_recebido, data_recebimento, observacao, id_usuario, id_agBancaria)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        amount,
        `${receivedAt} 00:00:00`,
        observation,
        user.id,
        agencyId,
      );

      const totals = await tx.$queryRawUnsafe<Array<{ total: number | string | null }>>(
        'SELECT COALESCE(SUM(valor_recebido), 0) AS total FROM recebimentos WHERE id_conta_receber=?',
        id,
      );
      const totalReceived = number(totals[0]?.total);
      const total = number(account.valor_total);
      const dueDate = isoDate(account.data_vencimento) ?? receivedAt;
      await tx.$executeRawUnsafe(
        'UPDATE contas_receber SET saldo=?, status_id=? WHERE id=?',
        Math.max(0, total - totalReceived),
        this.receivableStatus(totalReceived, total, dueDate),
        id,
      );
    });
  }

  async createPayable(
    user: AuthenticatedUser,
    input: FinancePayableWriteInput,
  ): Promise<{ id: number }> {
    this.assertManage(user);
    const data = this.payableInput(input);
    return this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO contas_pagar (
           descricao, fornecedor, valor, data_vencimento, unidade_negocio,
           id_grupo, id_subgrupo, id_classificacao, id_tipo_documento,
           id_usuario, status_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        data.description,
        data.supplier,
        data.amount,
        data.dueDate,
        data.unitId,
        data.groupId,
        data.subgroupId,
        data.classificationId,
        data.documentTypeId,
        user.id,
      );
      const ids = await tx.$queryRawUnsafe<Array<{ id: number | bigint | string }>>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      return { id: Number(ids[0]?.id) };
    });
  }

  async updatePayable(
    user: AuthenticatedUser,
    id: number,
    input: FinancePayableWriteInput,
  ): Promise<void> {
    this.assertManage(user);
    const data = this.payableInput(input);
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE contas_pagar
       SET descricao=?, fornecedor=?, valor=?, data_vencimento=?, unidade_negocio=?,
           id_grupo=?, id_subgrupo=?, id_classificacao=?, id_tipo_documento=?, id_usuario=?
       WHERE id=?`,
      data.description,
      data.supplier,
      data.amount,
      data.dueDate,
      data.unitId,
      data.groupId,
      data.subgroupId,
      data.classificationId,
      data.documentTypeId,
      user.id,
      id,
    );
    if (!changed) throw new NotFoundException('Conta a pagar não encontrada.');
  }

  async pay(
    user: AuthenticatedUser,
    id: number,
    input: FinancePaymentInput,
  ): Promise<void> {
    this.assertManage(user);
    const paidAt = date(input.date, 'date');
    const agencyId = positiveInt(input.agencyId, 'agencyId');
    const observation = text(input.observation, 10_000);
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE contas_pagar
       SET status_id=6, data_pagamento=?, id_agBancaria=?,
           observacao=CONCAT_WS('\n\n', observacao, ?)
       WHERE id=?`,
      paidAt,
      agencyId,
      observation ? `BAIXA: ${observation}` : 'BAIXA',
      id,
    );
    if (!changed) throw new NotFoundException('Conta a pagar não encontrada.');
  }

  async createRecurring(
    user: AuthenticatedUser,
    input: FinanceRecurringWriteInput,
  ): Promise<{ id: number }> {
    this.assertManage(user);
    const data = this.recurringInput(input);
    return this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO recorrencias (
           tipo, id_cliente, fornecedor_padrao, descricao_padrao, valor_padrao,
           dia_vencimento, unidade_negocio_padrao, id_grupo_padrao,
           id_subgrupo_padrao, id_classificacao_padrao, id_tipo_documento,
           id_usuario, ativo, percentual_ti_padrao, percentual_devops_padrao,
           percentual_marketing_padrao
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        data.type,
        data.clientId,
        data.supplier,
        data.description,
        data.amount,
        data.dueDay,
        data.unitId,
        data.groupId,
        data.subgroupId,
        data.classificationId,
        data.documentTypeId,
        user.id,
        data.active ? 1 : 0,
        data.percentTi,
        data.percentDevops,
        data.percentMarketing,
      );
      const ids = await tx.$queryRawUnsafe<Array<{ id: number | bigint | string }>>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      return { id: Number(ids[0]?.id) };
    });
  }

  async updateRecurring(
    user: AuthenticatedUser,
    id: number,
    input: FinanceRecurringWriteInput,
  ): Promise<void> {
    this.assertManage(user);
    const data = this.recurringInput(input);
    const changed = await this.database.$executeRawUnsafe(
      `UPDATE recorrencias
       SET tipo=?, id_cliente=?, fornecedor_padrao=?, descricao_padrao=?,
           valor_padrao=?, dia_vencimento=?, unidade_negocio_padrao=?,
           id_grupo_padrao=?, id_subgrupo_padrao=?, id_classificacao_padrao=?,
           id_tipo_documento=?, id_usuario=?, ativo=?, percentual_ti_padrao=?,
           percentual_devops_padrao=?, percentual_marketing_padrao=?
       WHERE id=?`,
      data.type,
      data.clientId,
      data.supplier,
      data.description,
      data.amount,
      data.dueDay,
      data.unitId,
      data.groupId,
      data.subgroupId,
      data.classificationId,
      data.documentTypeId,
      user.id,
      data.active ? 1 : 0,
      data.percentTi,
      data.percentDevops,
      data.percentMarketing,
      id,
    );
    if (!changed) throw new NotFoundException('Recorrência não encontrada.');
  }

  private assertRead(user: AuthenticatedUser, view: FinanceViewKey): void {
    if (view === 'statements') {
      if (
        !has(user, AppPermission.LogisticsStatementsRead) &&
        !has(user, AppPermission.LogisticsExpensesAdminRead) &&
        !has(user, AppPermission.LogisticsExpensesAdminManage)
      ) {
        throw new ForbiddenException('Usuário sem acesso aos extratos.');
      }
      return;
    }
    if (
      !has(user, AppPermission.LogisticsExpensesAdminRead) &&
      !has(user, AppPermission.LogisticsExpensesAdminManage)
    ) {
      throw new ForbiddenException('Usuário sem acesso ao financeiro.');
    }
  }

  private assertManage(user: AuthenticatedUser): void {
    if (!has(user, AppPermission.LogisticsExpensesAdminManage)) {
      throw new ForbiddenException('Usuário sem permissão para alterar o financeiro.');
    }
  }

  private canManage(user: AuthenticatedUser, view: FinanceViewKey): boolean {
    return view !== 'statements' && has(user, AppPermission.LogisticsExpensesAdminManage);
  }

  private async receivables(startDate: string, endDate: string): Promise<FinanceRow[]> {
    const rows = await this.database.$queryRawUnsafe<Row[]>(
      `SELECT cr.id, cr.data_vencimento, cr.descricao, cr.valor_total, cr.saldo,
              COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS party,
              s.nome AS status_name, un.nome_unid AS unit_name,
              g.nome AS group_name, sg.nome AS subgroup_name,
              cl.nome AS classification_name, td.nome AS document_name,
              COALESCE(r.is_recurring, 0) AS is_recurring,
              cr.id_cliente, cr.unidade_negocio, cr.id_grupo, cr.id_subgrupo,
              cr.id_classificacao, cr.id_tipo_documento,
              COALESCE(d.percentual_ti, 0) AS percent_ti,
              COALESCE(d.percentual_devops, 0) AS percent_devops,
              COALESCE(d.percentual_marketing, 0) AS percent_marketing
       FROM contas_receber cr
       INNER JOIN clientes c ON c.clt_id = cr.id_cliente
       LEFT JOIN status_contas s ON s.id = cr.status_id
       LEFT JOIN unidade_negocio un ON un.id = cr.unidade_negocio
       LEFT JOIN categorias_grupo g ON g.id = cr.id_grupo
       LEFT JOIN categorias_subgrupo sg ON sg.id = cr.id_subgrupo
       LEFT JOIN categorias_classificacao cl ON cl.id = cr.id_classificacao
       LEFT JOIN categorias_tipo_documento td ON td.id = cr.id_tipo_documento
       LEFT JOIN contas_receber_divisao d ON d.id_conta_receber = cr.id
       LEFT JOIN (
         SELECT id_conta_origem, 1 AS is_recurring
         FROM recorrencias WHERE tipo='Receber' AND ativo=1
         GROUP BY id_conta_origem
       ) r ON r.id_conta_origem = cr.id
       WHERE cr.data_vencimento BETWEEN ? AND ?
       ORDER BY cr.data_vencimento ASC, cr.id ASC
       LIMIT 2000`,
      startDate,
      endDate,
    );
    return rows.map((row) => ({
      id: `receivable:${row.id}`,
      sourceId: number(row.id),
      kind: 'receivable',
      date: isoDate(row.data_vencimento),
      dueDate: isoDate(row.data_vencimento),
      party: String(row.party ?? 'Cliente não informado'),
      description: String(row.descricao ?? ''),
      amount: number(row.valor_total),
      balance: number(row.saldo),
      status: String(row.status_name ?? 'Não informado'),
      unit: row.unit_name ? String(row.unit_name) : null,
      group: row.group_name ? String(row.group_name) : null,
      subgroup: row.subgroup_name ? String(row.subgroup_name) : null,
      classification: row.classification_name ? String(row.classification_name) : null,
      documentType: row.document_name ? String(row.document_name) : null,
      agency: null,
      observation: null,
      recurring: number(row.is_recurring) === 1,
      active: null,
      metadata: {
        clientId: number(row.id_cliente),
        unitId: number(row.unidade_negocio),
        groupId: number(row.id_grupo),
        subgroupId: number(row.id_subgrupo),
        classificationId: number(row.id_classificacao),
        documentTypeId: number(row.id_tipo_documento) || 0,
        percentTi: number(row.percent_ti),
        percentDevops: number(row.percent_devops),
        percentMarketing: number(row.percent_marketing),
      },
    }));
  }

  private async cashflow(startDate: string, endDate: string): Promise<FinanceRow[]> {
    const rows = await this.database.$queryRawUnsafe<Row[]>(
      `SELECT r.id, r.id_conta_receber, r.valor_recebido, r.data_recebimento,
              r.observacao, cr.descricao,
              COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS party,
              ab.ag_nome AS agency_name,
              COALESCE(d.percentual_ti, 0) AS percent_ti,
              COALESCE(d.percentual_devops, 0) AS percent_devops,
              COALESCE(d.percentual_marketing, 0) AS percent_marketing
       FROM recebimentos r
       INNER JOIN contas_receber cr ON cr.id = r.id_conta_receber
       INNER JOIN clientes c ON c.clt_id = cr.id_cliente
       LEFT JOIN contas_receber_divisao d ON d.id_conta_receber = cr.id
       LEFT JOIN agenciasbancarias ab ON ab.id = r.id_agBancaria
       WHERE DATE(r.data_recebimento) BETWEEN ? AND ?
       ORDER BY r.data_recebimento DESC, r.id DESC
       LIMIT 2000`,
      startDate,
      endDate,
    );
    return rows.map((row) => ({
      id: `receipt:${row.id}`,
      sourceId: number(row.id),
      kind: 'receipt',
      date: isoDate(row.data_recebimento),
      dueDate: null,
      party: String(row.party ?? 'Cliente não informado'),
      description: String(row.descricao ?? ''),
      amount: number(row.valor_recebido),
      balance: null,
      status: 'Recebido',
      unit: null,
      group: null,
      subgroup: null,
      classification: null,
      documentType: null,
      agency: row.agency_name ? String(row.agency_name) : null,
      observation: row.observacao ? String(row.observacao) : null,
      recurring: false,
      active: null,
      metadata: {
        accountId: number(row.id_conta_receber),
        percentTi: number(row.percent_ti),
        percentDevops: number(row.percent_devops),
        percentMarketing: number(row.percent_marketing),
      },
    }));
  }

  private async payables(startDate: string, endDate: string): Promise<FinanceRow[]> {
    const rows = await this.database.$queryRawUnsafe<Row[]>(
      `SELECT cp.id, cp.data_vencimento, cp.data_pagamento, cp.descricao, cp.fornecedor,
              cp.valor, cp.observacao, cp.status_id, s.nome AS status_name,
              un.nome_unid AS unit_name, g.nome AS group_name, sg.nome AS subgroup_name,
              cl.nome AS classification_name, td.nome AS document_name,
              ab.ag_nome AS agency_name, cp.unidade_negocio, cp.id_grupo,
              cp.id_subgrupo, cp.id_classificacao, cp.id_tipo_documento
       FROM contas_pagar cp
       LEFT JOIN status_contas s ON s.id = cp.status_id
       LEFT JOIN unidade_negocio un ON un.id = cp.unidade_negocio
       LEFT JOIN categorias_grupo g ON g.id = cp.id_grupo
       LEFT JOIN categorias_subgrupo sg ON sg.id = cp.id_subgrupo
       LEFT JOIN categorias_classificacao cl ON cl.id = cp.id_classificacao
       LEFT JOIN categorias_tipo_documento td ON td.id = cp.id_tipo_documento
       LEFT JOIN agenciasbancarias ab ON ab.id = cp.id_agBancaria
       WHERE cp.data_vencimento BETWEEN ? AND ?
       ORDER BY cp.data_vencimento ASC, cp.id ASC
       LIMIT 2000`,
      startDate,
      endDate,
    );
    return rows.map((row) => ({
      id: `payable:${row.id}`,
      sourceId: number(row.id),
      kind: 'payable',
      date: isoDate(row.data_pagamento ?? row.data_vencimento),
      dueDate: isoDate(row.data_vencimento),
      party: String(row.fornecedor ?? 'Fornecedor não informado'),
      description: String(row.descricao ?? ''),
      amount: number(row.valor),
      balance: number(row.status_id) === 6 ? 0 : number(row.valor),
      status: String(row.status_name ?? (number(row.status_id) === 6 ? 'Pago' : 'Pendente')),
      unit: row.unit_name ? String(row.unit_name) : null,
      group: row.group_name ? String(row.group_name) : null,
      subgroup: row.subgroup_name ? String(row.subgroup_name) : null,
      classification: row.classification_name ? String(row.classification_name) : null,
      documentType: row.document_name ? String(row.document_name) : null,
      agency: row.agency_name ? String(row.agency_name) : null,
      observation: row.observacao ? String(row.observacao) : null,
      recurring: false,
      active: null,
      metadata: {
        unitId: number(row.unidade_negocio),
        groupId: number(row.id_grupo),
        subgroupId: number(row.id_subgrupo),
        classificationId: number(row.id_classificacao),
        documentTypeId: number(row.id_tipo_documento) || 0,
        paid: number(row.status_id) === 6,
      },
    }));
  }

  private async recurring(): Promise<FinanceRow[]> {
    const rows = await this.database.$queryRawUnsafe<Row[]>(
      `SELECT r.id, r.tipo, r.descricao_padrao, r.valor_padrao, r.dia_vencimento,
              r.fornecedor_padrao, r.ativo, r.id_cliente,
              COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS client_name,
              un.nome_unid AS unit_name, g.nome AS group_name, sg.nome AS subgroup_name,
              cl.nome AS classification_name, td.nome AS document_name,
              r.unidade_negocio_padrao, r.id_grupo_padrao, r.id_subgrupo_padrao,
              r.id_classificacao_padrao, r.id_tipo_documento,
              COALESCE(r.percentual_ti_padrao, 0) AS percent_ti,
              COALESCE(r.percentual_devops_padrao, 0) AS percent_devops,
              COALESCE(r.percentual_marketing_padrao, 0) AS percent_marketing
       FROM recorrencias r
       LEFT JOIN clientes c ON c.clt_id = r.id_cliente
       LEFT JOIN unidade_negocio un ON un.id = r.unidade_negocio_padrao
       LEFT JOIN categorias_grupo g ON g.id = r.id_grupo_padrao
       LEFT JOIN categorias_subgrupo sg ON sg.id = r.id_subgrupo_padrao
       LEFT JOIN categorias_classificacao cl ON cl.id = r.id_classificacao_padrao
       LEFT JOIN categorias_tipo_documento td ON td.id = r.id_tipo_documento
       ORDER BY r.ativo DESC, r.tipo ASC, r.descricao_padrao ASC
       LIMIT 2000`,
    );
    return rows.map((row) => {
      const type = String(row.tipo ?? '');
      const party =
        type === 'Receber'
          ? String(row.client_name ?? 'Cliente não informado')
          : String(row.fornecedor_padrao ?? 'Fornecedor não informado');
      return {
        id: `recurring:${row.id}`,
        sourceId: number(row.id),
        kind: 'recurring',
        date: null,
        dueDate: null,
        party,
        description: String(row.descricao_padrao ?? ''),
        amount: number(row.valor_padrao),
        balance: null,
        status: number(row.ativo) === 1 ? 'Ativa' : 'Inativa',
        unit: row.unit_name ? String(row.unit_name) : null,
        group: row.group_name ? String(row.group_name) : null,
        subgroup: row.subgroup_name ? String(row.subgroup_name) : null,
        classification: row.classification_name ? String(row.classification_name) : null,
        documentType: row.document_name ? String(row.document_name) : null,
        agency: null,
        observation: null,
        recurring: true,
        active: number(row.ativo) === 1,
        metadata: {
          type,
          dueDay: number(row.dia_vencimento),
          clientId: number(row.id_cliente) || 0,
          supplier: String(row.fornecedor_padrao ?? ''),
          unitId: number(row.unidade_negocio_padrao),
          groupId: number(row.id_grupo_padrao),
          subgroupId: number(row.id_subgrupo_padrao),
          classificationId: number(row.id_classificacao_padrao),
          documentTypeId: number(row.id_tipo_documento) || 0,
          percentTi: number(row.percent_ti),
          percentDevops: number(row.percent_devops),
          percentMarketing: number(row.percent_marketing),
        },
      };
    });
  }

  private async entries(startDate: string, endDate: string): Promise<FinanceRow[]> {
    const [receivables, payables] = await Promise.all([
      this.receivables(startDate, endDate),
      this.payables(startDate, endDate),
    ]);
    return [...receivables, ...payables].sort((left, right) =>
      String(left.dueDate ?? left.date ?? '').localeCompare(
        String(right.dueDate ?? right.date ?? ''),
      ),
    );
  }

  private async ledger(startDate: string, endDate: string): Promise<FinanceRow[]> {
    const rows = await this.database.$queryRawUnsafe<Row[]>(
      `SELECT data, tipo_movimento, tipo_documento, descricao, entrada_entidade,
              saida_entidade, obs, grupo, subgrupo, classificacao, empresa, valor,
              id_tabela_origem
       FROM vw_fluxo_caixa_realizado
       WHERE data BETWEEN ? AND ?
       ORDER BY data DESC, id_tabela_origem DESC
       LIMIT 3000`,
      startDate,
      endDate,
    );
    return rows.map((row, index) => {
      const movement = String(row.tipo_movimento ?? '');
      const lower = movement.toLocaleLowerCase('pt-BR');
      const outgoing =
        lower.includes('saída') ||
        lower.includes('saida') ||
        lower.includes('pagar') ||
        lower.includes('despesa');
      return {
        id: `ledger:${row.id_tabela_origem ?? index}:${index}`,
        sourceId: number(row.id_tabela_origem) || null,
        kind: 'ledger',
        date: isoDate(row.data),
        dueDate: null,
        party: String(
          outgoing
            ? row.saida_entidade ?? row.empresa ?? ''
            : row.entrada_entidade ?? row.empresa ?? '',
        ),
        description: String(row.descricao ?? ''),
        amount: outgoing ? -Math.abs(number(row.valor)) : Math.abs(number(row.valor)),
        balance: null,
        status: movement || (outgoing ? 'Saída' : 'Entrada'),
        unit: row.empresa ? String(row.empresa) : null,
        group: row.grupo ? String(row.grupo) : null,
        subgroup: row.subgrupo ? String(row.subgrupo) : null,
        classification: row.classificacao ? String(row.classificacao) : null,
        documentType: row.tipo_documento ? String(row.tipo_documento) : null,
        agency: null,
        observation: row.obs ? String(row.obs) : null,
        recurring: false,
        active: null,
      };
    });
  }

  private summary(rows: FinanceRow[]) {
    let inflow = 0;
    let outflow = 0;
    let openReceivables = 0;
    let openPayables = 0;

    for (const row of rows) {
      if (row.kind === 'receipt' || row.kind === 'receivable') {
        inflow += Math.abs(row.amount);
      } else if (row.kind === 'payable') {
        outflow += Math.abs(row.amount);
      } else if (row.kind === 'recurring') {
        const type = String(row.metadata?.type ?? '');
        if (type === 'Receber') inflow += Math.abs(row.amount);
        else outflow += Math.abs(row.amount);
      } else if (row.kind === 'ledger') {
        if (row.amount >= 0) inflow += row.amount;
        else outflow += Math.abs(row.amount);
      }

      if (row.kind === 'receivable' && (row.balance ?? 0) > 0) {
        openReceivables += row.balance ?? 0;
      }
      if (row.kind === 'payable' && (row.balance ?? 0) > 0) {
        openPayables += row.balance ?? 0;
      }
    }

    return {
      inflow,
      outflow,
      balance: inflow - outflow,
      openReceivables,
      openPayables,
      count: rows.length,
    };
  }

  private receivableInput(input: FinanceReceivableWriteInput) {
    const percentTi = percent(input.percentTi);
    const percentDevops = percent(input.percentDevops);
    const percentMarketing = percent(input.percentMarketing);
    if (percentTi + percentDevops + percentMarketing > 100) {
      throw new BadRequestException('A soma dos percentuais não pode ultrapassar 100%.');
    }
    return {
      clientId: positiveInt(input.clientId, 'clientId'),
      description: text(input.description, 255, true),
      amount: money(input.amount, 'amount'),
      dueDate: date(input.dueDate, 'dueDate'),
      unitId: positiveInt(input.unitId, 'unitId'),
      groupId: positiveInt(input.groupId, 'groupId'),
      subgroupId: positiveInt(input.subgroupId, 'subgroupId'),
      classificationId: positiveInt(input.classificationId, 'classificationId'),
      documentTypeId: optionalPositiveInt(input.documentTypeId),
      percentTi,
      percentDevops,
      percentMarketing,
    };
  }

  private payableInput(input: FinancePayableWriteInput) {
    return {
      description: text(input.description, 255, true),
      supplier: text(input.supplier, 100),
      amount: money(input.amount, 'amount'),
      dueDate: date(input.dueDate, 'dueDate'),
      unitId: positiveInt(input.unitId, 'unitId'),
      groupId: positiveInt(input.groupId, 'groupId'),
      subgroupId: positiveInt(input.subgroupId, 'subgroupId'),
      classificationId: positiveInt(input.classificationId, 'classificationId'),
      documentTypeId: optionalPositiveInt(input.documentTypeId),
    };
  }

  private recurringInput(input: FinanceRecurringWriteInput) {
    if (input.type !== 'Receber' && input.type !== 'Pagar') {
      throw new BadRequestException('Tipo de recorrência inválido.');
    }
    const dueDay = positiveInt(input.dueDay, 'dueDay');
    if (dueDay > 31) throw new BadRequestException('dueDay deve ficar entre 1 e 31.');
    const percentTi = percent(input.percentTi);
    const percentDevops = percent(input.percentDevops);
    const percentMarketing = percent(input.percentMarketing);
    if (percentTi + percentDevops + percentMarketing > 100) {
      throw new BadRequestException('A soma dos percentuais não pode ultrapassar 100%.');
    }
    return {
      type: input.type,
      clientId:
        input.type === 'Receber' ? optionalPositiveInt(input.clientId) : null,
      supplier: input.type === 'Pagar' ? text(input.supplier, 100) : '',
      description: text(input.description, 255, true),
      amount: money(input.amount, 'amount'),
      dueDay,
      unitId: positiveInt(input.unitId, 'unitId'),
      groupId: positiveInt(input.groupId, 'groupId'),
      subgroupId: positiveInt(input.subgroupId, 'subgroupId'),
      classificationId: positiveInt(input.classificationId, 'classificationId'),
      documentTypeId: optionalPositiveInt(input.documentTypeId),
      percentTi,
      percentDevops,
      percentMarketing,
      active: input.active === true,
    };
  }

  private receivableStatus(received: number, total: number, dueDate: string): number {
    if (received >= total) return 3;
    if (received > 0) return 2;
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today) {
      return dueDate.slice(0, 7) < today.slice(0, 7) ? 5 : 4;
    }
    return 1;
  }
}
