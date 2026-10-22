import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient as Nivel3PrismaClient } from './generated/nivel3/client';
import { enableMysqlCompatibility } from './sqlserver/mysql-compat';

export const DATABASE_ENV = {
  nivel3: 'NIVEL3_DATABASE_URL',
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

function createSqlServerAdapter(databaseUrl: string): PrismaMssql {
  if (!databaseUrl.toLowerCase().startsWith('sqlserver://')) {
    throw new Error('NIVEL3_DATABASE_URL must use the sqlserver:// protocol');
  }

  const database = databaseUrl.match(/(?:^|;)database=([^;]+)/i)?.[1]?.trim();
  const password =
    process.env.NIVEL3_SQLSERVER_PASSWORD?.trim() ||
    process.env.DB_ROOT_PASSWORD?.trim();

  if (!database) {
    throw new Error('NIVEL3_DATABASE_URL must include database=...');
  }
  if (!password) {
    throw new Error(
      'Missing NIVEL3_SQLSERVER_PASSWORD (DB_ROOT_PASSWORD is accepted as a temporary fallback)',
    );
  }

  return enableMysqlCompatibility(
    new PrismaMssql(
      {
        server: process.env.NIVEL3_SQLSERVER_HOST?.trim() || '127.0.0.1',
        port: Number(process.env.NIVEL3_SQLSERVER_PORT ?? 55523),
        database,
        user: process.env.NIVEL3_SQLSERVER_USER?.trim() || 'nivel3_app',
        password,
        connectionTimeout: 15_000,
        requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS ?? 60_000),
        pool: {
          max: connectionLimit(),
          min: 0,
          idleTimeoutMillis: 300_000,
        },
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
      },
      { schema: 'dbo' },
    ),
  );
}

export function createNivel3Client(
  databaseUrl = requiredDatabaseUrl(DATABASE_ENV.nivel3),
) {
  return new Nivel3PrismaClient({
    adapter: createSqlServerAdapter(databaseUrl),
  });
}

export type Nivel3DatabaseClient = ReturnType<typeof createNivel3Client>;

export { synchronizeNavigation } from './navigation/synchronize-navigation';

export { RBAC_PERMISSION_SLUGS } from './access/rbac-permissions';
