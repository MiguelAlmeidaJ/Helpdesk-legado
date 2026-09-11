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
      SELECT user_id, user_nome, user_sts
      FROM usuarios
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const user = users[0];

    if (!user) {
      throw new Error(`Usuário ${userId} não encontrado em usuarios.`);
    }

    await db.$executeRaw`
      INSERT INTO roles (
        name,
        slug,
        description,
        is_system,
        created_at,
        updated_at
      )
      VALUES (
        ${SYSTEM_ADMIN_ROLE.name},
        ${SYSTEM_ADMIN_ROLE.slug},
        ${SYSTEM_ADMIN_ROLE.description},
        1,
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        is_system = 1,
        updated_at = NOW()
    `;

    const roles = await db.$queryRaw<RoleRow[]>`
      SELECT id
      FROM roles
      WHERE slug = ${SYSTEM_ADMIN_ROLE.slug}
      LIMIT 1
    `;
    const role = roles[0];

    if (!role) {
      throw new Error('Não foi possível localizar a role system-admin após o upsert.');
    }

    await db.$executeRaw`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES (${userId}, ${role.id}, NULL)
      ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)
    `;

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
