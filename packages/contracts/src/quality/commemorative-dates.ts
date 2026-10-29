export interface CommemorativeDate {
  id: number;
  date: string;
  name: string;
  national: boolean;
  origin?: 'legacy' | 'regional';
  scope?: 'state' | 'municipal';
  state?: string;
  municipalityId?: number;
  municipalityName?: string;
}

export interface CommemorativeDatesResponse {
  items: CommemorativeDate[];
  currentYear: number;
  nextYear: number;
}

export interface SaveCommemorativeDateRequest {
  /** Dia/mês, sem ano (DD/MM). */
  date: string;
  name: string;
  scope: 'state' | 'municipal';
  state: string;
  municipalityId?: number;
}

export interface HolidayLocationsResponse {
  states: Array<{ code: string; name: string }>;
  municipalities: Array<{ id: number; name: string }>;
}
