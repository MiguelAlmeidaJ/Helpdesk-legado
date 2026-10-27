import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

const SYSTEM_ADMIN_ROLE = {
  name: 'Administrador global',
  slug: 'system-admin',
  description: 'Acesso administrativo global ao Helpdesk nativo.',
} as const;

interface UserRow {
  user_id: number;
  user_nome: string | null;
  user_sts: number | null;
}

interface RoleRow {
  id: number;
}

function parseUserId(value: string | undefined): number {
  const userId = Number(value);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error(
      'Informe um user_id positivo. Exemplo: pnpm access:grant-system-admin -- 157',
    );
  }

  return userId;
}

async function main() {
  const userIdArgument = process.argv
    .slice(2)
    .find((argument) => argument !== '--');
  const userId = parseUserId(userIdArgument);
  const db = createNivel3Client();

  try {
    const users = await db.$queryRaw<UserRow[]>`
      SELECT TOP (1) user_id, user_nome, user_sts
      FROM usuarios
      WHERE user_id = ${userId}
    `;
    const user = users[0];

    if (!user) {
      throw new Error(`Usuário ${userId} não encontrado em usuarios.`);
    }

    // A concessão é idempotente e usa SQL Server, sem sintaxe MySQL.
    await db.$transaction(async (tx) => {
      const roles = await tx.$queryRaw<RoleRow[]>`
        SELECT TOP (1) id
        FROM roles WITH (UPDLOCK, HOLDLOCK)
        WHERE slug = ${SYSTEM_ADMIN_ROLE.slug}
      `;
      let roleId = Number(roles[0]?.id ?? 0);

      if (roleId > 0) {
        await tx.$executeRaw`
          UPDATE roles
          SET name = ${SYSTEM_ADMIN_ROLE.name},
              description = ${SYSTEM_ADMIN_ROLE.description},
              is_system = 1,
              updated_at = GETDATE()
          WHERE id = ${roleId}
        `;
      } else {
        const inserted = await tx.$queryRaw<RoleRow[]>`
          INSERT INTO roles (name, slug, description, is_system, created_at, updated_at)
          OUTPUT INSERTED.id AS id
          VALUES (
            ${SYSTEM_ADMIN_ROLE.name},
            ${SYSTEM_ADMIN_ROLE.slug},
            ${SYSTEM_ADMIN_ROLE.description},
            1,
            GETDATE(),
            GETDATE()
          )
        `;
        roleId = Number(inserted[0]?.id ?? 0);
      }

      if (!Number.isSafeInteger(roleId) || roleId <= 0) {
        throw new Error('Não foi possível localizar a role system-admin.');
      }

      const existingAssignment = await tx.$queryRaw<{ total: bigint | number }[]>`
        SELECT COUNT(*) AS total
        FROM user_roles WITH (UPDLOCK, HOLDLOCK)
        WHERE user_id = ${userId} AND role_id = ${roleId}
      `;
      if (Number(existingAssignment[0]?.total ?? 0) === 0) {
        await tx.$executeRaw`
          INSERT INTO user_roles (user_id, role_id, assigned_by)
          VALUES (${userId}, ${roleId}, NULL)
        `;
      }
    });

    console.log('Administrador global configurado com sucesso.');
    console.log(`  user_id: ${user.user_id}`);
    console.log(`  nome: ${user.user_nome ?? '(sem nome)'}`);
    console.log(`  ativo: ${user.user_sts === 1 ? 'sim' : 'não'}`);
    console.log(`  role: ${SYSTEM_ADMIN_ROLE.slug}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
