export interface CommemorativeDate {
  id: number;
  date: string;
  name: string;
  national: boolean;
}

export interface CommemorativeDatesResponse {
  items: CommemorativeDate[];
  currentYear: number;
  nextYear: number;
}

export interface SaveCommemorativeDateRequest {
  date: string;
  name: string;
}
