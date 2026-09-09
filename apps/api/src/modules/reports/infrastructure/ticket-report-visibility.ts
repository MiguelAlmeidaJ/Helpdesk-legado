import type { Nivel3DatabaseClient } from '@helpdesk/database';

interface UserVisibilityRow {
  tipo_usuario: number | null;
}

interface ClientScopeRow {
  cliente_id: number;
}

export interface TicketReportVisibility {
  restrictClients: boolean;
  clientIds: number[];
}

function positiveUnique(values: number[]): number[] {
  return [
    ...new Set(
      values.filter((value) => Number.isInteger(value) && value > 0),
    ),
  ];
}

export function appendNumberInFilter(
  where: string[],
  params: unknown[],
  column: string,
  values: number[],
) {
  const normalized = positiveUnique(values);

  if (normalized.length === 0) {
    return;
  }

  where.push(`${column} IN (${normalized.map(() => '?').join(', ')})`);
  params.push(...normalized);
}

export async function resolveTicketReportVisibility(
  database: Nivel3DatabaseClient,
  userId: number,
): Promise<TicketReportVisibility> {
  const users = await database.$queryRawUnsafe<UserVisibilityRow[]>(
    `SELECT tipo_usuario
     FROM usuarios
     WHERE user_id = ?
     LIMIT 1`,
    userId,
  );

  if (users[0] && users[0].tipo_usuario !== 2) {
    return {
      restrictClients: false,
      clientIds: [],
    };
  }

  if (!users[0]) return { restrictClients: true, clientIds: [] };

  const clients = await database.$queryRawUnsafe<ClientScopeRow[]>(
    `SELECT cliente_id
     FROM clientes_usuarios
     WHERE usuario_id = ?`,
    userId,
  );

  return {
    restrictClients: true,
    clientIds: clients.map((row) => row.cliente_id),
  };
}
