import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CommemorativeDate,
  CommemorativeDatesResponse,
  SaveCommemorativeDateRequest,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface DateRow {
  id: number;
  holiday_date: string;
  name: string;
  is_national: number | boolean;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

@Injectable()
export class QualityCalendarService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async list(): Promise<CommemorativeDatesResponse> {
    const currentYear = new Date().getFullYear();
    const rows = await this.database.$queryRawUnsafe<DateRow[]>(
      `SELECT
         id,
         DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_date,
         name,
         is_national
       FROM business_holidays
       ORDER BY holiday_date ASC, id ASC
       LIMIT 500`,
    );

    return {
      currentYear,
      nextYear: currentYear + 1,
      items: rows.map((row) => this.map(row)),
    };
  }

  async create(input: SaveCommemorativeDateRequest): Promise<CommemorativeDate> {
    if (!validDate(input.date)) {
      throw new BadRequestException('Data inválida.');
    }

    const name = input.name.trim();
    if (!name || name.length > 120) {
      throw new BadRequestException(
        'Nome deve ter entre 1 e 120 caracteres.',
      );
    }

    const existing = await this.byDate(input.date);
    if (existing?.national) {
      throw new ConflictException(
        'Essa data já é um feriado nacional e não pode ser sobrescrita.',
      );
    }

    await this.database.$executeRawUnsafe(
      `INSERT INTO business_holidays
         (holiday_date, name, is_national, created_at)
       VALUES (?, ?, 0, NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         is_national = 0`,
      input.date,
      name,
    );

    const saved = await this.byDate(input.date);
    if (!saved) {
      throw new NotFoundException('Data não encontrada após o cadastro.');
    }
    return saved;
  }

  async delete(id: number): Promise<void> {
    const rows = await this.database.$queryRawUnsafe<DateRow[]>(
      `SELECT
         id,
         DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_date,
         name,
         is_national
       FROM business_holidays
       WHERE id = ?
       LIMIT 1`,
      id,
    );
    const item = rows[0];
    if (!item) throw new NotFoundException('Data comemorativa não encontrada.');
    if (Number(item.is_national) === 1) {
      throw new ConflictException(
        'Feriados nacionais são mantidos automaticamente e não podem ser excluídos.',
      );
    }

    await this.database.$executeRawUnsafe(
      'DELETE FROM business_holidays WHERE id = ?',
      id,
    );
  }

  private async byDate(date: string): Promise<CommemorativeDate | null> {
    const rows = await this.database.$queryRawUnsafe<DateRow[]>(
      `SELECT
         id,
         DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_date,
         name,
         is_national
       FROM business_holidays
       WHERE holiday_date = ?
       LIMIT 1`,
      date,
    );
    return rows[0] ? this.map(rows[0]) : null;
  }

  private map(row: DateRow): CommemorativeDate {
    return {
      id: Number(row.id),
      date: row.holiday_date,
      name: row.name,
      national: Number(row.is_national) === 1,
    };
  }
}
