import { Inject, Injectable } from '@nestjs/common';
import type {
  VehicleAgendaOption,
  VehicleAgendaSchedule,
  VehicleAgendaVehicle,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

interface VehicleRow {
  id: number;
  veiculo: string | null;
  placa: string | null;
  ativo: number | null;
}

interface OptionRow {
  id: number;
  name: string | null;
}

interface UserContextRow {
  tipo_usuario: number | null;
}

interface ScheduleRow {
  id: number;
  veiculo_id: number;
  data: Date | string;
  empresa: number | null;
  nome_empresa: string | null;
  cidade: string | null;
  horario: string | null;
  motorista: number | null;
  motorista_nome: string | null;
  observacoes: string | null;
  usuario_id: number;
  usuario_nome: string | null;
  kmInicial: number | string | null;
  kmFinal: number | string | null;
  visibilidade: number | null;
  color: number | string | null;
  arquivado: number | null;
}

interface HistoryRow {
  id: number;
  data: Date | string | null;
  horario: string | null;
  veiculo_id: number | null;
  data_anterior: Date | string | null;
  horario_anterior: string | null;
  veiculo_id_anterior: number | null;
  arquivado: number | null;
}

interface CountRow {
  total: bigint | number;
}

function wallDate(value: Date | string | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function numeric(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

@Injectable()
export class VehicleAgendaRepository {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly database: Nivel3DatabaseClient,
  ) {}

  async userType(userId: number): Promise<number> {
    const rows = await this.database.$queryRawUnsafe<UserContextRow[]>(
      'SELECT tipo_usuario FROM usuarios WHERE user_id = ? LIMIT 1',
      userId,
    );
    return Number(rows[0]?.tipo_usuario ?? 0);
  }

  async companyIds(userId: number): Promise<number[]> {
    const rows = await this.database.$queryRawUnsafe<{ id: number }[]>(
      'SELECT cliente_id AS id FROM clientes_usuarios WHERE usuario_id = ?',
      userId,
    );
    return rows.map((row) => Number(row.id));
  }

  async vehicles(activeOnly: boolean): Promise<VehicleAgendaVehicle[]> {
    const rows = await this.database.$queryRawUnsafe<VehicleRow[]>(
      `SELECT id, veiculo, placa, ativo
       FROM veiculos
       ${activeOnly ? 'WHERE ativo = 1' : ''}
       ORDER BY id`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.veiculo ?? `Veículo #${row.id}`,
      plate: row.placa ?? '',
      active: Number(row.ativo) === 1,
    }));
  }

  async clients(allowedIds?: number[]): Promise<VehicleAgendaOption[]> {
    if (allowedIds && allowedIds.length === 0) return [];
    const where = allowedIds
      ? `AND clt_id IN (${allowedIds.map(() => '?').join(',')})`
      : '';
    const rows = await this.database.$queryRawUnsafe<OptionRow[]>(
      `SELECT clt_id AS id, clt_nomef AS name
       FROM clientes
       WHERE clt_sts = 1 ${where}
       ORDER BY clt_nomef`,
      ...(allowedIds ?? []),
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name ?? `Cliente #${row.id}`,
    }));
  }

  async drivers(): Promise<VehicleAgendaOption[]> {
    const rows = await this.database.$queryRaw<OptionRow[]>`
      SELECT user_id AS id, user_nome AS name
      FROM usuarios
      WHERE user_sts = 1
      ORDER BY user_nome
    `;
    return rows.map((row) => ({
      id: row.id,
      name: row.name ?? `Usuário #${row.id}`,
    }));
  }

  async schedules(
    month: number,
    year: number,
    canSeePrivate: boolean,
  ): Promise<VehicleAgendaSchedule[]> {
    const rows = await this.database.$queryRawUnsafe<ScheduleRow[]>(
      `SELECT
         a.id,
         a.veiculo_id,
         a.data,
         a.empresa,
         c.clt_nomef AS nome_empresa,
         a.cidade,
         a.horario,
         a.motorista,
         m.user_nome AS motorista_nome,
         a.observacoes,
         a.usuario_id,
         u.user_nome AS usuario_nome,
         a.kmInicial,
         a.kmFinal,
         a.visibilidade,
         a.color,
         a.arquivado
       FROM agenda_veiculos a
       JOIN usuarios u ON u.user_id = a.usuario_id
       LEFT JOIN usuarios m ON m.user_id = a.motorista
       LEFT JOIN clientes c ON c.clt_id = a.empresa
       WHERE MONTH(a.data) = ?
         AND YEAR(a.data) = ?
         ${canSeePrivate ? '' : 'AND a.visibilidade = 0'}
       ORDER BY a.data, a.veiculo_id, a.horario, a.id`,
      month,
      year,
    );
    return rows.map((row) => ({
      id: row.id,
      vehicleId: row.veiculo_id,
      date: wallDate(row.data),
      clientId: row.empresa,
      clientName: row.nome_empresa ?? 'Empresa',
      destination: row.cidade ?? '',
      time: (row.horario ?? '').slice(0, 5),
      driverId: row.motorista,
      driverName: row.motorista_nome ?? '',
      notes: row.observacoes ?? '',
      createdById: row.usuario_id,
      createdByName: row.usuario_nome ?? '',
      initialKm: numeric(row.kmInicial),
      finalKm: numeric(row.kmFinal),
      visibility: Number(row.visibilidade) === 1 ? 1 : 0,
      color: Math.max(1, Math.min(18, Number(row.color) || 1)),
      archived: Number(row.arquivado) === 1,
    }));
  }

  async canUndo(userId: number): Promise<boolean> {
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM agenda_veiculos
       WHERE modificado_por_id = ?
         AND data_anterior IS NOT NULL`,
      userId,
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async scheduleById(id: number): Promise<HistoryRow | null> {
    const rows = await this.database.$queryRawUnsafe<HistoryRow[]>(
      `SELECT id, data, horario, veiculo_id, data_anterior, horario_anterior,
              veiculo_id_anterior, arquivado
       FROM agenda_veiculos
       WHERE id = ?
       LIMIT 1`,
      id,
    );
    return rows[0] ?? null;
  }

  async hasScheduleConflict(
    vehicleId: number,
    date: string,
    time: string,
    exceptId?: number,
  ): Promise<boolean> {
    const rows = await this.database.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM agenda_veiculos
       WHERE veiculo_id = ?
         AND data = ?
         AND horario = ?
         ${exceptId ? 'AND id <> ?' : ''}`,
      vehicleId,
      date,
      time,
      ...(exceptId ? [exceptId] : []),
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async createSchedule(input: {
    userId: number;
    vehicleId: number;
    date: string;
    clientId: number;
    destination: string;
    time: string;
    driverId: number;
    notes: string;
    initialKm: number | null;
    finalKm: number | null;
    visibility: 0 | 1;
    color: number;
  }): Promise<void> {
    await this.database.$executeRawUnsafe(
      `INSERT INTO agenda_veiculos
        (veiculo_id, data, empresa, cidade, horario, motorista, observacoes,
         usuario_id, kmInicial, kmFinal, visibilidade, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.vehicleId,
      input.date,
      input.clientId,
      input.destination,
      input.time,
      input.driverId,
      input.notes,
      input.userId,
      input.initialKm,
      input.finalKm,
      input.visibility,
      input.color,
    );
  }

  async updateSchedule(input: {
    id: number;
    modifiedById: number;
    vehicleId: number;
    date: string;
    clientId: number;
    destination: string;
    time: string;
    driverId: number;
    notes: string;
    initialKm: number | null;
    finalKm: number | null;
    visibility: 0 | 1;
    color: number;
    archived: boolean;
    previous: HistoryRow;
  }): Promise<void> {
    await this.database.$executeRawUnsafe(
      `UPDATE agenda_veiculos
       SET veiculo_id = ?, data = ?, empresa = ?, cidade = ?, horario = ?,
           motorista = ?, observacoes = ?, kmInicial = ?, kmFinal = ?,
           visibilidade = ?, color = ?, arquivado = ?,
           data_anterior = ?, horario_anterior = ?, veiculo_id_anterior = ?,
           ultima_alteracao = NOW(), modificado_por_id = ?
       WHERE id = ?`,
      input.vehicleId,
      input.date,
      input.clientId,
      input.destination,
      input.time,
      input.driverId,
      input.notes,
      input.initialKm,
      input.finalKm,
      input.visibility,
      input.color,
      input.archived ? 1 : 0,
      wallDate(input.previous.data),
      input.previous.horario,
      input.previous.veiculo_id,
      input.modifiedById,
      input.id,
    );
  }

  async deleteSchedule(id: number): Promise<void> {
    await this.database.$executeRawUnsafe(
      'DELETE FROM agenda_veiculos WHERE id = ?',
      id,
    );
  }

  async moveSchedule(input: {
    id: number;
    modifiedById: number;
    vehicleId: number;
    date: string;
    previous: HistoryRow;
  }): Promise<void> {
    await this.database.$executeRawUnsafe(
      `UPDATE agenda_veiculos
       SET data = ?, veiculo_id = ?,
           data_anterior = ?, horario_anterior = ?, veiculo_id_anterior = ?,
           ultima_alteracao = NOW(), modificado_por_id = ?
       WHERE id = ?`,
      input.date,
      input.vehicleId,
      wallDate(input.previous.data),
      input.previous.horario,
      input.previous.veiculo_id,
      input.modifiedById,
      input.id,
    );
  }

  async duplicateSchedule(
    sourceId: number,
    vehicleId: number,
    date: string,
  ): Promise<boolean> {
    const changed = await this.database.$executeRawUnsafe(
      `INSERT INTO agenda_veiculos
        (empresa, cidade, motorista, observacoes, horario, usuario_id,
         visibilidade, color, veiculo_id, data)
       SELECT empresa, cidade, motorista, observacoes, horario, usuario_id,
              visibilidade, color, ?, ?
       FROM agenda_veiculos
       WHERE id = ?`,
      vehicleId,
      date,
      sourceId,
    );
    return changed > 0;
  }

  async undoLast(userId: number): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const rows = await transaction.$queryRawUnsafe<HistoryRow[]>(
        `SELECT id, data, horario, veiculo_id, data_anterior, horario_anterior,
                veiculo_id_anterior, arquivado
         FROM agenda_veiculos
         WHERE modificado_por_id = ?
           AND data_anterior IS NOT NULL
         ORDER BY ultima_alteracao DESC
         LIMIT 1`,
        userId,
      );
      const row = rows[0];
      if (!row || !row.data_anterior || !row.veiculo_id_anterior) return false;

      await transaction.$executeRawUnsafe(
        `UPDATE agenda_veiculos
         SET data = ?, horario = ?, veiculo_id = ?,
             data_anterior = NULL, horario_anterior = NULL,
             veiculo_id_anterior = NULL, ultima_alteracao = NULL,
             modificado_por_id = NULL
         WHERE id = ?`,
        wallDate(row.data_anterior),
        row.horario_anterior,
        row.veiculo_id_anterior,
        row.id,
      );
      return true;
    });
  }

  async createVehicle(
    name: string,
    plate: string,
    active: boolean,
  ): Promise<void> {
    await this.database.$executeRawUnsafe(
      'INSERT INTO veiculos (veiculo, placa, ativo) VALUES (?, ?, ?)',
      name,
      plate,
      active ? 1 : 0,
    );
  }

  async updateVehicle(
    id: number,
    name: string,
    plate: string,
    active: boolean,
  ): Promise<boolean> {
    const changed = await this.database.$executeRawUnsafe(
      'UPDATE veiculos SET veiculo = ?, placa = ?, ativo = ? WHERE id = ?',
      name,
      plate,
      active ? 1 : 0,
      id,
    );
    return changed > 0;
  }

  async deleteVehicle(id: number): Promise<boolean> {
    const usage = await this.database.$queryRawUnsafe<CountRow[]>(
      'SELECT COUNT(*) AS total FROM agenda_veiculos WHERE veiculo_id = ?',
      id,
    );
    if (Number(usage[0]?.total ?? 0) > 0) return false;

    const changed = await this.database.$executeRawUnsafe(
      'DELETE FROM veiculos WHERE id = ?',
      id,
    );
    return changed > 0;
  }
}
