import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type {
  OnCallAssignment,
  OnCallCurrentState,
  OnCallSettings,
  OnCallSnapshot,
  OnCallUserOption,
  SaveOnCallWeekRequest,
  UpdateOnCallSettingsRequest,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface SettingsRow {
  business_start: string;
  business_end: string;
}

interface AssignmentRow {
  area: 'ti' | 'devops';
  user_id: number;
  user_name: string | null;
  week_start: string;
}

interface UserRow {
  id: number;
  name: string | null;
}

interface ClockRow {
  now_value: string;
  today_value: string;
  weekday_value: number | bigint;
  time_value: string;
}

interface CountRow {
  total: number | bigint;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function mondayOf(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class OnCallManagementService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async snapshot(weekDate?: string): Promise<OnCallSnapshot> {
    const [settings, current, users, permissionRows] = await Promise.all([
      this.settings(),
      this.currentState(),
      this.users(),
      this.database.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM role_permissions rp
         INNER JOIN roles r ON r.id = rp.role_id
         WHERE r.slug = 'plantonista'`,
      ),
    ]);

    const selectedWeekStart = weekDate
      ? this.normalizeWeek(weekDate)
      : current.serviceWeekStart;
    const assignments = await this.assignments(selectedWeekStart);

    return {
      selectedWeekStart,
      settings,
      assignments,
      users,
      current,
      plantonistaPermissionCount: Number(permissionRows[0]?.total ?? 0),
    };
  }

  async saveWeek(input: SaveOnCallWeekRequest, actorId: number): Promise<void> {
    const weekStart = this.normalizeWeek(input.weekDate);
    await this.assertUsers([input.tiUserId, input.devopsUserId]);

    await this.database.$transaction(async (tx) => {
      for (const [area, userId] of [
        ['ti', input.tiUserId],
        ['devops', input.devopsUserId],
      ] as const) {
        await tx.$executeRawUnsafe(
          `INSERT INTO on_call_schedules
             (week_start, area, user_id, assigned_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             user_id = VALUES(user_id),
             assigned_by = VALUES(assigned_by),
             updated_at = NOW()`,
          weekStart,
          area,
          userId,
          actorId,
        );
      }
    });
  }

  async updateSettings(input: UpdateOnCallSettingsRequest): Promise<OnCallSettings> {
    if (!/^\d{2}:\d{2}$/.test(input.businessStart) || !/^\d{2}:\d{2}$/.test(input.businessEnd)) {
      throw new BadRequestException('Horários devem usar HH:mm.');
    }
    if (input.businessStart >= input.businessEnd) {
      throw new BadRequestException('O início do expediente deve ser anterior ao fim.');
    }

    await this.database.$executeRawUnsafe(
      `UPDATE business_calendar_settings
       SET business_start = ?, business_end = ?, updated_at = NOW()
       WHERE id = 1`,
      `${input.businessStart}:00`,
      `${input.businessEnd}:00`,
    );
    return this.settings();
  }

  private normalizeWeek(value: string): string {
    if (!validDate(value)) {
      throw new BadRequestException('Semana deve usar uma data válida em YYYY-MM-DD.');
    }
    return mondayOf(value);
  }

  private async settings(): Promise<OnCallSettings> {
    const rows = await this.database.$queryRawUnsafe<SettingsRow[]>(
      `SELECT
         DATE_FORMAT(business_start, '%H:%i') AS business_start,
         DATE_FORMAT(business_end, '%H:%i') AS business_end
       FROM business_calendar_settings
       WHERE id = 1
       LIMIT 1`,
    );
    return {
      businessStart: rows[0]?.business_start ?? '07:00',
      businessEnd: rows[0]?.business_end ?? '19:00',
    };
  }

  private async users(): Promise<OnCallUserOption[]> {
    const rows = await this.database.$queryRawUnsafe<UserRow[]>(
      `SELECT user_id AS id, user_nome AS name
       FROM usuarios
       WHERE user_sts = 1
         AND tipo_usuario = 1
       ORDER BY user_nome ASC, user_id ASC`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name?.trim() || `Usuário #${row.id}`,
    }));
  }

  private async assignments(weekStart: string): Promise<OnCallAssignment[]> {
    const rows = await this.database.$queryRawUnsafe<AssignmentRow[]>(
      `SELECT
         s.area,
         s.user_id,
         u.user_nome AS user_name,
         DATE_FORMAT(s.week_start, '%Y-%m-%d') AS week_start
       FROM on_call_schedules s
       INNER JOIN usuarios u ON u.user_id = s.user_id
       WHERE s.week_start = ?
       ORDER BY FIELD(s.area, 'ti', 'devops')`,
      weekStart,
    );

    return rows.map((row) => ({
      area: row.area,
      userId: row.user_id,
      userName: row.user_name?.trim() || `Usuário #${row.user_id}`,
      weekStart: row.week_start,
    }));
  }

  private async currentState(): Promise<OnCallCurrentState> {
    const [settings, clock] = await Promise.all([
      this.settings(),
      this.database.$queryRawUnsafe<ClockRow[]>(
        `SELECT
           DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') AS now_value,
           DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today_value,
           WEEKDAY(CURDATE()) AS weekday_value,
           DATE_FORMAT(NOW(), '%H:%i') AS time_value`,
      ),
    ]);

    const row = clock[0] ?? {
      now_value: new Date().toISOString(),
      today_value: new Date().toISOString().slice(0, 10),
      weekday_value: 0,
      time_value: '12:00',
    };
    const weekday = Number(row.weekday_value);
    let serviceWeekStart = mondayOf(row.today_value);

    // A troca semanal acontece na abertura de segunda-feira.
    if (weekday === 0 && row.time_value < settings.businessStart) {
      serviceWeekStart = addDays(serviceWeekStart, -7);
    }

    const holidayRows = await this.database.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name
       FROM business_holidays
       WHERE holiday_date = CURDATE()
       LIMIT 1`,
    );
    const holidayName = holidayRows[0]?.name ?? null;
    const weekend = weekday >= 5;
    const afterHours =
      row.time_value >= settings.businessEnd ||
      row.time_value < settings.businessStart;

    const active = Boolean(holidayName) || weekend || afterHours;
    const reason = holidayName
      ? 'holiday'
      : weekend
        ? 'weekend'
        : afterHours
          ? 'after-hours'
          : 'business-hours';

    return {
      now: row.now_value,
      serviceWeekStart,
      active,
      reason,
      holidayName,
      assignments: active ? await this.assignments(serviceWeekStart) : [],
    };
  }

  private async assertUsers(ids: number[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.some((id) => !Number.isSafeInteger(id) || id < 1)) {
      throw new BadRequestException('Plantonista inválido.');
    }

    const placeholders = unique.map(() => '?').join(',');
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM usuarios
       WHERE user_id IN (${placeholders})
         AND user_sts = 1
         AND tipo_usuario = 1`,
      ...unique,
    );
    if (Number(rows[0]?.total ?? 0) !== unique.length) {
      throw new BadRequestException('Um dos plantonistas não é um usuário interno ativo.');
    }
  }
}
