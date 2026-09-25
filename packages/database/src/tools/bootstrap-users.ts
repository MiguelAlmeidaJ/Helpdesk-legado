import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

type CountRow = { total: number | bigint };

async function columnExists(
  db: ReturnType<typeof createNivel3Client>,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    table,
    column,
  );
  return Number(rows[0]?.total ?? 0) > 0;
}

async function main() {
  const db = createNivel3Client();

  try {
    if (!(await columnExists(db, 'usuarios', 'user_observacao'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE usuarios ADD COLUMN user_observacao TEXT NULL AFTER chavepix',
      );
    }

    console.log('Estrutura de usuários atualizada.');
    console.log('  usuarios.user_observacao: OK');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
