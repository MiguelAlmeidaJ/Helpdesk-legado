import { Inject, Injectable } from '@nestjs/common';
import type {
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
