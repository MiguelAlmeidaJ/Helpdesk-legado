import { Inject, Injectable } from '@nestjs/common';
import type {
  SaveTicketSlaRuleRequest,
  TicketSlaPolicyResponse,
  TicketSlaRule,
  TicketSlaSettings,
  UpdateTicketSlaSettingsRequest,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface SettingsRow {
  id: number;
  quality_minutes: number | bigint | string | null;
  clerio_minutes: number | bigint | string | null;
}

interface RuleRow {
  id: number;
  name: string;
  client_id: number | null;
  client_name: string | null;
  category_id: number | null;
  category_name: string | null;
  priority: number | null;
  quality_minutes: number | bigint | string;
  clerio_minutes: number | bigint | string;
  active: number | boolean;
  sort_order: number;
}

interface CatalogRow {
  id: number;
  name: string;
}

@Injectable()
export class TicketSlaSettingsService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async get(): Promise<TicketSlaSettings> {
    const row = await this.settingsRow();
    return {
      qualityMinutes: Number(row.quality_minutes ?? 40) || 40,
      clerioMinutes: Number(row.clerio_minutes ?? 60) || 60,
    };
  }

  async policy(): Promise<TicketSlaPolicyResponse> {
    const [defaults, rules, clients, categories] = await Promise.all([
      this.get(),
      this.database.$queryRawUnsafe<RuleRow[]>(
        `SELECT
           r.id,
           r.name,
           r.client_id,
           COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS client_name,
           r.category_id,
           cat.cat_nome AS category_name,
           r.priority,
           r.quality_minutes,
           r.clerio_minutes,
           r.active,
           r.sort_order
         FROM ticket_sla_rules r
         LEFT JOIN clientes c ON c.clt_id = r.client_id
         LEFT JOIN categorias cat ON cat.cat_id = r.category_id
         ORDER BY r.active DESC, r.sort_order ASC, r.id ASC`,
      ),
      this.database.$queryRawUnsafe<CatalogRow[]>(
        `SELECT clt_id AS id, COALESCE(NULLIF(clt_nomef, ''), clt_nomer) AS name
         FROM clientes
         WHERE clt_sts = 1
         ORDER BY name ASC`,
      ),
      this.database.$queryRawUnsafe<CatalogRow[]>(
        `SELECT cat_id AS id, cat_nome AS name
         FROM categorias
         WHERE cat_sts = 1
         ORDER BY cat_nome ASC`,
      ),
    ]);

    return {
      defaults,
      rules: rules.map((row) => this.mapRule(row)),
      catalogs: {
        clients: clients.map((row) => ({ id: row.id, name: row.name })),
        categories: categories.map((row) => ({ id: row.id, name: row.name })),
      },
    };
  }

  async createRule(input: SaveTicketSlaRuleRequest): Promise<TicketSlaRule> {
    const id = await this.database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO ticket_sla_rules
           (name, client_id, category_id, priority, quality_minutes, clerio_minutes, active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        input.name,
        input.clientId ?? null,
        input.categoryId ?? null,
        input.priority ?? null,
        input.qualityMinutes,
        input.clerioMinutes,
        input.active ? 1 : 0,
        input.sortOrder,
      );

      const rows = await tx.$queryRawUnsafe<Array<{ id: bigint | number }>>(
        'SELECT LAST_INSERT_ID() AS id',
      );
      return Number(rows[0]?.id ?? 0);
    });

    return this.ruleById(id);
  }

  async updateRule(id: number, input: SaveTicketSlaRuleRequest): Promise<TicketSlaRule> {
    await this.database.$executeRawUnsafe(
      `UPDATE ticket_sla_rules
       SET name = ?, client_id = ?, category_id = ?, priority = ?,
           quality_minutes = ?, clerio_minutes = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      input.name,
      input.clientId ?? null,
      input.categoryId ?? null,
      input.priority ?? null,
      input.qualityMinutes,
      input.clerioMinutes,
      input.active ? 1 : 0,
      input.sortOrder,
      id,
    );

    return this.ruleById(id);
  }

  async deleteRule(id: number): Promise<void> {
    await this.database.$executeRawUnsafe(
      'DELETE FROM ticket_sla_rules WHERE id = ?',
      id,
    );
  }

  async update(
    input: UpdateTicketSlaSettingsRequest,
  ): Promise<TicketSlaSettings> {
    const row = await this.settingsRow();

    await this.database.$executeRawUnsafe(
      `UPDATE configuracao
       SET tempo_alerta = ?, sla_n1 = ?
       WHERE id = ?`,
      input.qualityMinutes,
      input.clerioMinutes,
      row.id,
    );

    return {
      qualityMinutes: input.qualityMinutes,
      clerioMinutes: input.clerioMinutes,
    };
  }

  private async ruleById(id: number): Promise<TicketSlaRule> {
    const rows = await this.database.$queryRawUnsafe<RuleRow[]>(
      `SELECT
         r.id,
         r.name,
         r.client_id,
         COALESCE(NULLIF(c.clt_nomef, ''), c.clt_nomer) AS client_name,
         r.category_id,
         cat.cat_nome AS category_name,
         r.priority,
         r.quality_minutes,
         r.clerio_minutes,
         r.active,
         r.sort_order
       FROM ticket_sla_rules r
       LEFT JOIN clientes c ON c.clt_id = r.client_id
       LEFT JOIN categorias cat ON cat.cat_id = r.category_id
       WHERE r.id = ?
       LIMIT 1`,
      id,
    );

    if (!rows[0]) {
      throw new Error('Regra de SLA não encontrada.');
    }

    return this.mapRule(rows[0]);
  }

  private mapRule(row: RuleRow): TicketSlaRule {
    return {
      id: row.id,
      name: row.name,
      clientId: row.client_id,
      clientName: row.client_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      priority: row.priority,
      qualityMinutes: Number(row.quality_minutes),
      clerioMinutes: Number(row.clerio_minutes),
      active: Boolean(row.active),
      sortOrder: row.sort_order,
    };
  }

  private async settingsRow(): Promise<SettingsRow> {
    const rows = await this.database.$queryRawUnsafe<SettingsRow[]>(
      `SELECT
         id,
         COALESCE(NULLIF(tempo_alerta, 0), 40) AS quality_minutes,
         COALESCE(NULLIF(sla_n1, 0), 60) AS clerio_minutes
       FROM configuracao
       ORDER BY id ASC
       LIMIT 1`,
    );

    if (rows[0]) return rows[0];

    await this.database.$executeRawUnsafe(
      'INSERT INTO configuracao (tempo_alerta, sla_n1) VALUES (40, 60)',
    );

    const created = await this.database.$queryRawUnsafe<SettingsRow[]>(
      `SELECT
         id,
         tempo_alerta AS quality_minutes,
         sla_n1 AS clerio_minutes
       FROM configuracao
       ORDER BY id ASC
       LIMIT 1`,
    );

    return (
      created[0] ?? {
        id: 1,
        quality_minutes: 40,
        clerio_minutes: 60,
      }
    );
  }
}
