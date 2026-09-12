export interface VehicleAgendaVehicle {
  id: number;
  name: string;
  plate: string;
  active: boolean;
}

export interface VehicleAgendaOption {
  id: number;
  name: string;
}

export interface VehicleAgendaSchedule {
  id: number;
  vehicleId: number;
  date: string;
  clientId: number | null;
  clientName: string;
  destination: string;
  time: string;
  driverId: number | null;
  driverName: string;
  notes: string;
  createdById: number;
  createdByName: string;
  initialKm: number | null;
  finalKm: number | null;
  visibility: 0 | 1;
  color: number;
  archived: boolean;
}

export interface VehicleAgendaResponse {
  month: number;
  year: number;
  canManage: boolean;
  canUndo: boolean;
  vehicles: VehicleAgendaVehicle[];
  vehicleCatalog: VehicleAgendaVehicle[];
  clients: VehicleAgendaOption[];
  drivers: VehicleAgendaOption[];
  schedules: VehicleAgendaSchedule[];
}

export interface CreateVehicleAgendaScheduleRequest {
  vehicleId: number;
  date: string;
  clientId: number;
  destination: string;
  time: string;
  driverId: number;
  notes?: string;
  initialKm?: number | null;
  finalKm?: number | null;
  visibility: 0 | 1;
  color: number;
}

export interface UpdateVehicleAgendaScheduleRequest
  extends CreateVehicleAgendaScheduleRequest {
  archived: boolean;
}

export interface MoveVehicleAgendaScheduleRequest {
  vehicleId: number;
  date: string;
}

export interface DuplicateVehicleAgendaScheduleRequest {
  vehicleId: number;
  date: string;
}

export interface UpsertVehicleAgendaVehicleRequest {
  name: string;
  plate: string;
  active: boolean;
}
