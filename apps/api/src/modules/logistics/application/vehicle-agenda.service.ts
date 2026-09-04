import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateVehicleAgendaScheduleRequest,
  DuplicateVehicleAgendaScheduleRequest,
  MoveVehicleAgendaScheduleRequest,
  UpdateVehicleAgendaScheduleRequest,
  UpsertVehicleAgendaVehicleRequest,
  VehicleAgendaResponse,
} from '@helpdesk/contracts';
import type { AuthenticatedUser } from '../../access/domain/authenticated-user';
import { VehicleAgendaRepository } from '../infrastructure/vehicle-agenda.repository';

const PRIVATE_VISIBILITY_FUNCTIONS = new Set([1, 2, 3, 9, 10, 18]);

@Injectable()
export class VehicleAgendaService {
  constructor(private readonly repository: VehicleAgendaRepository) {}

  async get(
    user: AuthenticatedUser,
    month: number,
    year: number,
    canManage: boolean,
  ): Promise<VehicleAgendaResponse> {
    const userType = await this.repository.userType(user.id);
    const allowedCompanyIds =
      userType === 2 ? await this.repository.companyIds(user.id) : undefined;
    const canSeePrivate =
      user.functionId !== null &&
      PRIVATE_VISIBILITY_FUNCTIONS.has(user.functionId);

    const [vehicles, vehicleCatalog, clients, drivers, schedules, canUndo] =
      await Promise.all([
        this.repository.vehicles(true),
        this.repository.vehicles(false),
        this.repository.clients(allowedCompanyIds),
        this.repository.drivers(),
        this.repository.schedules(month, year, canSeePrivate),
        canManage ? this.repository.canUndo(user.id) : Promise.resolve(false),
      ]);

    return {
      month,
      year,
      canManage,
      canUndo,
      vehicles,
      vehicleCatalog,
      clients,
      drivers,
      schedules,
    };
  }

  async createSchedule(
    user: AuthenticatedUser,
    request: CreateVehicleAgendaScheduleRequest,
  ): Promise<void> {
    if (
      await this.repository.hasScheduleConflict(
        request.vehicleId,
        request.date,
        request.time,
      )
    ) {
      throw new ConflictException(
        'Já existe um agendamento para este veículo nesta data e horário.',
      );
    }

    await this.repository.createSchedule({
      userId: user.id,
      ...request,
      destination: request.destination.trim().toUpperCase(),
      notes: request.notes?.trim() ?? '',
      initialKm: request.initialKm ?? null,
      finalKm: request.finalKm ?? null,
    });
  }

  async updateSchedule(
    user: AuthenticatedUser,
    id: number,
    request: UpdateVehicleAgendaScheduleRequest,
  ): Promise<void> {
    const previous = await this.repository.scheduleById(id);
    if (!previous) throw new NotFoundException('Agendamento não encontrado.');
    if (Number(previous.arquivado) === 1) {
      throw new BadRequestException(
        'Este agendamento está arquivado e não pode mais ser editado.',
      );
    }

    if (
      await this.repository.hasScheduleConflict(
        request.vehicleId,
        request.date,
        request.time,
        id,
      )
    ) {
      throw new ConflictException(
        'Já existe um agendamento para este veículo nesta data e horário.',
      );
    }

    if (
      request.archived &&
      (request.initialKm === null ||
        request.initialKm === undefined ||
        request.finalKm === null ||
        request.finalKm === undefined)
    ) {
      throw new BadRequestException(
        'Preencha o KM Inicial e o KM Final antes de arquivar.',
      );
    }

    if (
      request.archived &&
      request.initialKm !== null &&
      request.initialKm !== undefined &&
      request.finalKm !== null &&
      request.finalKm !== undefined &&
      request.finalKm < request.initialKm
    ) {
      throw new BadRequestException(
        'O KM Final deve ser maior ou igual ao KM Inicial.',
      );
    }

    await this.repository.updateSchedule({
      id,
      modifiedById: user.id,
      ...request,
      destination: request.destination.trim().toUpperCase(),
      notes: request.notes?.trim() ?? '',
      initialKm: request.initialKm ?? null,
      finalKm: request.finalKm ?? null,
      previous,
    });
  }

  async deleteSchedule(id: number): Promise<void> {
    const schedule = await this.repository.scheduleById(id);
    if (!schedule) throw new NotFoundException('Agendamento não encontrado.');
    if (Number(schedule.arquivado) === 1) {
      throw new BadRequestException(
        'Agendamentos arquivados não podem ser excluídos.',
      );
    }
    await this.repository.deleteSchedule(id);
  }

  async moveSchedule(
    user: AuthenticatedUser,
    id: number,
    request: MoveVehicleAgendaScheduleRequest,
  ): Promise<void> {
    const previous = await this.repository.scheduleById(id);
    if (!previous) throw new NotFoundException('Agendamento não encontrado.');
    if (Number(previous.arquivado) === 1) {
      throw new BadRequestException(
        'Agendamentos arquivados não podem ser movimentados.',
      );
    }
    if (!previous.horario) {
      throw new BadRequestException('Agendamento sem horário válido.');
    }

    if (
      await this.repository.hasScheduleConflict(
        request.vehicleId,
        request.date,
        previous.horario.slice(0, 5),
        id,
      )
    ) {
      throw new ConflictException(
        'Já existe um agendamento para este veículo nesta data e horário.',
      );
    }

    await this.repository.moveSchedule({
      id,
      modifiedById: user.id,
      vehicleId: request.vehicleId,
      date: request.date,
      previous,
    });
  }

  async duplicateSchedule(
    sourceId: number,
    request: DuplicateVehicleAgendaScheduleRequest,
  ): Promise<void> {
    const source = await this.repository.scheduleById(sourceId);
    if (!source) throw new NotFoundException('Agendamento não encontrado.');
    if (!source.horario) {
      throw new BadRequestException('Agendamento sem horário válido.');
    }

    if (
      await this.repository.hasScheduleConflict(
        request.vehicleId,
        request.date,
        source.horario.slice(0, 5),
      )
    ) {
      throw new ConflictException(
        'Já existe um agendamento para este veículo nesta data e horário.',
      );
    }

    const created = await this.repository.duplicateSchedule(
      sourceId,
      request.vehicleId,
      request.date,
    );
    if (!created) throw new NotFoundException('Agendamento não encontrado.');
  }

  async undo(userId: number): Promise<void> {
    const undone = await this.repository.undoLast(userId);
    if (!undone) {
      throw new NotFoundException(
        'Nenhuma alteração sua foi encontrada para desfazer.',
      );
    }
  }

  createVehicle(request: UpsertVehicleAgendaVehicleRequest): Promise<void> {
    return this.repository.createVehicle(
      request.name.trim().toUpperCase(),
      request.plate.trim().toUpperCase(),
      request.active,
    );
  }

  async updateVehicle(
    id: number,
    request: UpsertVehicleAgendaVehicleRequest,
  ): Promise<void> {
    const updated = await this.repository.updateVehicle(
      id,
      request.name.trim().toUpperCase(),
      request.plate.trim().toUpperCase(),
      request.active,
    );
    if (!updated) throw new NotFoundException('Veículo não encontrado.');
  }

  async deleteVehicle(id: number): Promise<void> {
    const deleted = await this.repository.deleteVehicle(id);
    if (!deleted) {
      throw new BadRequestException(
        'O veículo não existe ou possui agendamentos vinculados.',
      );
    }
  }
}
