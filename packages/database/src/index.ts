import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient as N3rdPrismaClient } from './generated/n3rd/client';
import { PrismaClient as Nivel3PrismaClient } from './generated/nivel3/client';

export const DATABASE_ENV = {
  nivel3: 'NIVEL3_DATABASE_URL',
  n3rd: 'N3RD_DATABASE_URL',
} as const;

export type HelpdeskDatabase = keyof typeof DATABASE_ENV;

function requiredDatabaseUrl(environmentVariable: string): string {
  const value = process.env[environmentVariable]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${environmentVariable}`);
  }

  return value;
}

function connectionLimit(): number {
  const value = Number(process.env.DB_CONNECTION_LIMIT ?? 5);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error('DB_CONNECTION_LIMIT must be a positive integer');
  }

  return value;
}

function createMariaDbAdapter(databaseUrl: string): PrismaMariaDb {
  const url = new URL(databaseUrl);

  if (url.protocol !== 'mysql:' && url.protocol !== 'mariadb:') {
    throw new Error(`Unsupported database protocol: ${url.protocol}`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

  if (!database) {
    throw new Error('Database URL must include a database name');
  }

  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: connectionLimit(),
  });
}

export function createNivel3Client(
  databaseUrl = requiredDatabaseUrl(DATABASE_ENV.nivel3),
) {
  return new Nivel3PrismaClient({
    adapter: createMariaDbAdapter(databaseUrl),
  });
}

export function createN3rdClient(
  databaseUrl = requiredDatabaseUrl(DATABASE_ENV.n3rd),
) {
  return new N3rdPrismaClient({
    adapter: createMariaDbAdapter(databaseUrl),
  });
}

export type Nivel3DatabaseClient = ReturnType<typeof createNivel3Client>;
export type N3rdDatabaseClient = ReturnType<typeof createN3rdClient>;
