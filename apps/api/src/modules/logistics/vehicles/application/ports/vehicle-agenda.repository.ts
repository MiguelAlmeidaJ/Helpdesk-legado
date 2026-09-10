import type {
  CreateVehicleAgendaScheduleRequest,
  MoveVehicleAgendaScheduleRequest,
  UpdateVehicleAgendaScheduleRequest,
  VehicleAgendaOption,
  VehicleAgendaSchedule,
  VehicleAgendaVehicle,
} from '@helpdesk/contracts';

export interface VehicleAgendaHistory {
  id: number;
  data: Date | string | null;
  horario: string | null;
  veiculo_id: number | null;
  data_anterior: Date | string | null;
  horario_anterior: string | null;
  veiculo_id_anterior: number | null;
  arquivado: number | null;
}

export abstract class VehicleAgendaRepository {
  abstract userType(userId: number): Promise<number>;
  abstract companyIds(userId: number): Promise<number[]>;
  abstract vehicles(activeOnly: boolean): Promise<VehicleAgendaVehicle[]>;
  abstract clients(allowedIds?: number[]): Promise<VehicleAgendaOption[]>;
  abstract drivers(): Promise<VehicleAgendaOption[]>;
  abstract schedules(
    month: number,
    year: number,
    canSeePrivate: boolean,
  ): Promise<VehicleAgendaSchedule[]>;
  abstract canUndo(userId: number): Promise<boolean>;
  abstract scheduleById(id: number): Promise<VehicleAgendaHistory | null>;

  abstract hasScheduleConflict(
    vehicleId: number,
    date: string,
    time: string,
    exceptId?: number,
  ): Promise<boolean>;

  abstract createSchedule(
    input: CreateVehicleAgendaScheduleRequest & {
      userId: number;
      destination: string;
      notes: string;
      initialKm: number | null;
      finalKm: number | null;
    },
  ): Promise<void>;

  abstract updateSchedule(
    input: UpdateVehicleAgendaScheduleRequest & {
      id: number;
      modifiedById: number;
      destination: string;
      notes: string;
      initialKm: number | null;
      finalKm: number | null;
      previous: VehicleAgendaHistory;
    },
  ): Promise<void>;

  abstract deleteSchedule(id: number): Promise<void>;

  abstract moveSchedule(
    input: MoveVehicleAgendaScheduleRequest & {
      id: number;
      modifiedById: number;
      previous: VehicleAgendaHistory;
    },
  ): Promise<void>;

  abstract duplicateSchedule(
    sourceId: number,
    vehicleId: number,
    date: string,
  ): Promise<boolean>;

  abstract undoLast(userId: number): Promise<boolean>;

  abstract createVehicle(
    name: string,
    plate: string,
    active: boolean,
  ): Promise<void>;

  abstract updateVehicle(
    id: number,
    name: string,
    plate: string,
    active: boolean,
  ): Promise<boolean>;

  abstract deleteVehicle(id: number): Promise<boolean>;
}
