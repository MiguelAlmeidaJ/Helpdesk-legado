import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CommemorativeDate, CommemorativeDatesResponse, HolidayLocationsResponse, SaveCommemorativeDateRequest } from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';
import localities from '../infrastructure/brazil-localities.json';

interface DateRow { id: number; holiday_date: string; name: string; is_national: number; }
interface RegionalRow { id: number; holiday_month: number; holiday_day: number; name: string; scope: 'state' | 'municipal'; state: string; municipality_id: number; municipality_name: string | null; }
const REGIONAL_COLUMNS = 'id, holiday_month, holiday_day, name, scope, state, municipality_id, municipality_name';
const NATIONAL = [
  ['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia Mundial do Trabalho'],
  ['09-07', 'Independência do Brasil'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'], ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'], ['12-25', 'Natal'],
] as const;

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function goodFriday(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const value = h + l - 7 * m + 114;
  return new Date(Date.UTC(year, Math.floor(value / 31) - 1, value % 31 - 1)).toISOString().slice(0, 10);
}

@Injectable()
export class QualityCalendarService {
  constructor(@Inject(NIVEL3_DATABASE) private readonly database: Nivel3DatabaseClient) {}

  locations(state?: string): HolidayLocationsResponse {
    const selected = state ? localities.find(item => item.code === state) : undefined;
    if (state && !selected) throw new BadRequestException('Estado inválido.');
    return { states: localities.map(({ code, name }) => ({ code, name })), municipalities: selected?.municipalities ?? [] };
  }

  async list(year?: number): Promise<CommemorativeDatesResponse> {
    const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
    if (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 9998)) throw new BadRequestException('Ano inválido.');
    const [legacy, regional] = await Promise.all([
      this.database.$queryRawUnsafe<DateRow[]>(`SELECT id, CONVERT(char(10), holiday_date, 23) AS holiday_date, name, is_national FROM business_holidays ORDER BY holiday_date, id`),
      this.database.$queryRawUnsafe<RegionalRow[]>(`SELECT ${REGIONAL_COLUMNS} FROM business_regional_holidays ORDER BY holiday_month, holiday_day, id`),
    ]);
    const years = new Set([currentYear, currentYear + 1, ...(year ? [year] : []), ...legacy.map(row => Number(row.holiday_date.slice(0, 4)))]);
    const items: CommemorativeDate[] = [];
    for (const selectedYear of years) {
      const national = [...NATIONAL.map(([date, name]) => ({ date: `${selectedYear}-${date}`, name })), { date: goodFriday(selectedYear), name: 'Sexta-feira Santa' }];
      for (const [index, holiday] of national.entries()) {
        const stored = legacy.find(row => Number(row.is_national) === 1 && row.holiday_date === holiday.date);
        items.push({ id: stored ? Number(stored.id) : -index - 1, ...holiday, name: stored?.name ?? holiday.name, national: true, origin: 'legacy' });
      }
      for (const row of legacy) {
        const national = Number(row.is_national) === 1;
        const date = national ? row.holiday_date : `${selectedYear}-${row.holiday_date.slice(5)}`;
        if (national && Number(date.slice(0, 4)) !== selectedYear || !validDate(date)) continue;
        if (national && items.some(item => item.national && item.date === date)) continue;
        items.push({ id: Number(row.id), date, name: row.name, national, origin: 'legacy' });
      }
      for (const row of regional) {
        const item = this.mapRegional(row, selectedYear);
        if (validDate(item.date)) items.push(item);
      }
    }
    items.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'pt-BR'));
    return { currentYear, nextYear: currentYear + 1, items };
  }

  async create(input: SaveCommemorativeDateRequest): Promise<CommemorativeDate> {
    if (!/^\d{2}\/\d{2}$/.test(input.date)) throw new BadRequestException('Informe a data no formato DD/MM.');
    const [day, month] = input.date.split('/').map(Number);
    if (!validDate(`2000-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)) throw new BadRequestException('Dia e mês inválidos.');
    const name = input.name.trim();
    if (!name || name.length > 120) throw new BadRequestException('Nome deve ter entre 1 e 120 caracteres.');
    if (input.scope !== 'state' && input.scope !== 'municipal') throw new BadRequestException('Selecione abrangência estadual ou municipal.');
    const state = localities.find(item => item.code === input.state);
    if (!state) throw new BadRequestException('Selecione um estado válido.');
    const municipality = input.scope === 'municipal' ? state.municipalities.find(item => item.id === input.municipalityId) : undefined;
    if (input.scope === 'municipal' && !municipality) throw new BadRequestException('Selecione um município do estado informado.');
    if (input.scope === 'state' && input.municipalityId) throw new BadRequestException('Feriado estadual não deve informar município.');
    try {
      const saved = await this.database.$queryRawUnsafe<RegionalRow[]>(`INSERT INTO business_regional_holidays
        (holiday_month, holiday_day, name, scope, state, municipality_id, municipality_name)
        OUTPUT INSERTED.id, INSERTED.holiday_month, INSERTED.holiday_day, INSERTED.name, INSERTED.scope, INSERTED.state, INSERTED.municipality_id, INSERTED.municipality_name
        VALUES (?, ?, ?, ?, ?, ?, ?)`, month, day, name, input.scope, state.code, municipality?.id ?? 0, municipality?.name ?? null);
      return this.mapRegional(saved[0], 2000);
    } catch (error) {
      const detail = error as { code?: string; meta?: { driverAdapterError?: { cause?: { kind?: string } } } };
      if (detail.code === 'P2002' || detail.meta?.driverAdapterError?.cause?.kind === 'UniqueConstraintViolation') {
        throw new ConflictException('Já existe um feriado neste dia e mês para a abrangência e localidade selecionadas.');
      }
      throw error;
    }
  }

  async delete(id: number, regional = false): Promise<void> {
    if (regional) {
      const affected = await this.database.$executeRawUnsafe('DELETE FROM business_regional_holidays WHERE id = ?', id);
      if (!affected) throw new NotFoundException('Feriado não encontrado.');
      return;
    }
    const rows = await this.database.$queryRawUnsafe<DateRow[]>('SELECT id, is_national FROM business_holidays WHERE id = ?', id);
    if (!rows[0]) throw new NotFoundException('Data comemorativa não encontrada.');
    if (Number(rows[0].is_national) === 1) throw new ConflictException('Feriados nacionais são mantidos automaticamente e não podem ser excluídos.');
    await this.database.$executeRawUnsafe('DELETE FROM business_holidays WHERE id = ? AND is_national = 0', id);
  }

  private mapRegional(row: RegionalRow, year: number): CommemorativeDate {
    return { id: Number(row.id), date: `${year}-${String(row.holiday_month).padStart(2, '0')}-${String(row.holiday_day).padStart(2, '0')}`,
      name: row.name, national: false, origin: 'regional', scope: row.scope, state: row.state,
      municipalityId: Number(row.municipality_id) || undefined, municipalityName: row.municipality_name ?? undefined };
  }
}
