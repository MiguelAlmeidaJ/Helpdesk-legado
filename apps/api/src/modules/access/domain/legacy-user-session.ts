export type LegacyModuleNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface LegacyUserSession {
  id: number;
  name: string;
  login: string;
  functionId: number | null;
  modules: Record<LegacyModuleNumber, string>;
}
