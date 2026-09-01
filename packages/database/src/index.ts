export const DATABASE_ENV = {
  nivel3: 'NIVEL3_DATABASE_URL',
  n3rd: 'N3RD_DATABASE_URL',
} as const;

export type HelpdeskDatabase = keyof typeof DATABASE_ENV;
