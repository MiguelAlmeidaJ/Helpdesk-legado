import type {
  CreateVehicleAgendaScheduleRequest,
  DuplicateVehicleAgendaScheduleRequest,
  MoveVehicleAgendaScheduleRequest,
  UpdateVehicleAgendaScheduleRequest,
  UpsertVehicleAgendaVehicleRequest,
  VehicleAgendaResponse,
} from '@helpdesk/contracts';
import { apiRequest } from '../../../shared/api/api-client';

const base = 'logistics/vehicles/agenda';

export function getVehicleAgenda(
  month: number,
  year: number,
): Promise<VehicleAgendaResponse> {
  return apiRequest<VehicleAgendaResponse>(
    `${base}?month=${month}&year=${year}`,
  );
}

export function createVehicleAgendaSchedule(
  request: CreateVehicleAgendaScheduleRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function updateVehicleAgendaSchedule(
  id: number,
  request: UpdateVehicleAgendaScheduleRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function deleteVehicleAgendaSchedule(id: number): Promise<void> {
  return apiRequest<void>(`${base}/schedules/${id}`, { method: 'DELETE' });
}

export function moveVehicleAgendaSchedule(
  id: number,
  request: MoveVehicleAgendaScheduleRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/schedules/${id}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function duplicateVehicleAgendaSchedule(
  id: number,
  request: DuplicateVehicleAgendaScheduleRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/schedules/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function undoVehicleAgendaChange(): Promise<void> {
  return apiRequest<void>(`${base}/undo`, { method: 'POST' });
}

export function createVehicleAgendaVehicle(
  request: UpsertVehicleAgendaVehicleRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function updateVehicleAgendaVehicle(
  id: number,
  request: UpsertVehicleAgendaVehicleRequest,
): Promise<void> {
  return apiRequest<void>(`${base}/vehicles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

export function deleteVehicleAgendaVehicle(id: number): Promise<void> {
  return apiRequest<void>(`${base}/vehicles/${id}`, { method: 'DELETE' });
}
