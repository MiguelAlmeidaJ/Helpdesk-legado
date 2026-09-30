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

    const mapped = rows.map((row) => this.map(row));
    const years = new Set<number>([currentYear, currentYear + 1]);

    for (const item of mapped) {
      years.add(Number(item.date.slice(0, 4)));
    }

    const recurring = mapped.filter((item) => !item.national);
    const recurringItems = [...years]
      .filter(Number.isFinite)
      .flatMap((year) =>
        recurring.map((item) => ({
          ...item,
          date: `${year}-${item.date.slice(5)}`,
        })),
      );

    const nationalItems = mapped.filter((item) => item.national);
    const items = [...nationalItems, ...recurringItems]
      .filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.id === item.id &&
              candidate.date === item.date &&
              candidate.national === item.national,
          ) === index,
      )
      .sort((left, right) =>
        left.date.localeCompare(right.date) || left.id - right.id,
      );

    return {
      currentYear,
      nextYear: currentYear + 1,
      items,
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

    const recurringNational = await this.database.$queryRawUnsafe<DateRow[]>(
      `SELECT
         id,
         DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_date,
         name,
         is_national
       FROM business_holidays
       WHERE is_national = 1
         AND DATE_FORMAT(holiday_date, '%m-%d') = ?
       LIMIT 1`,
      input.date.slice(5),
    );
    if (recurringNational[0]) {
      throw new ConflictException(
        'Esse dia e mês já correspondem a um feriado nacional.',
      );
    }

    const existingCustom = await this.database.$queryRawUnsafe<DateRow[]>(
      `SELECT
         id,
         DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_date,
         name,
         is_national
       FROM business_holidays
       WHERE is_national = 0
         AND DATE_FORMAT(holiday_date, '%m-%d') = ?
       LIMIT 1`,
      input.date.slice(5),
    );

    if (existingCustom[0]) {
      await this.database.$executeRawUnsafe(
        'UPDATE business_holidays SET name = ? WHERE id = ?',
        name,
        existingCustom[0].id,
      );
    } else {
      await this.database.$executeRawUnsafe(
        `INSERT INTO business_holidays
           (holiday_date, name, is_national, created_at)
         VALUES (?, ?, 0, NOW())`,
        input.date,
        name,
      );
    }

    const savedRows = await this.database.$queryRawUnsafe<DateRow[]>(
      `SELECT
         id,
         DATE_FORMAT(holiday_date, '%Y-%m-%d') AS holiday_date,
         name,
         is_national
       FROM business_holidays
       WHERE is_national = 0
         AND DATE_FORMAT(holiday_date, '%m-%d') = ?
       LIMIT 1`,
      input.date.slice(5),
    );
    const saved = savedRows[0] ? this.map(savedRows[0]) : null;
    if (!saved) {
      throw new NotFoundException('Data não encontrada após o cadastro.');
    }
    return { ...saved, date: input.date };
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
