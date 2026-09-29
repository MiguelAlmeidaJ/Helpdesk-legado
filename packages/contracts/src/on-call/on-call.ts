export type OnCallArea = 'ti' | 'devops';

export interface OnCallUserOption {
  id: number;
  name: string;
}

export interface OnCallAssignment {
  area: OnCallArea;
  userId: number;
  userName: string;
  weekStart: string;
}

export interface OnCallHoliday {
  id: number;
  date: string;
  name: string;
}

export interface OnCallSettings {
  businessStart: string;
  businessEnd: string;
}

export type OnCallWindowReason =
  | 'business-hours'
  | 'after-hours'
  | 'weekend'
  | 'holiday';

export interface OnCallCurrentState {
  now: string;
  serviceWeekStart: string;
  active: boolean;
  reason: OnCallWindowReason;
  holidayName: string | null;
  assignments: OnCallAssignment[];
}

export interface OnCallSnapshot {
  selectedWeekStart: string;
  settings: OnCallSettings;
  assignments: OnCallAssignment[];
  users: OnCallUserOption[];
  holidays: OnCallHoliday[];
  current: OnCallCurrentState;
  plantonistaPermissionCount: number;
}

export interface SaveOnCallWeekRequest {
  weekDate: string;
  tiUserId: number;
  devopsUserId: number;
}

export interface UpdateOnCallSettingsRequest {
  businessStart: string;
  businessEnd: string;
}

export interface CreateOnCallHolidayRequest {
  date: string;
  name: string;
}
