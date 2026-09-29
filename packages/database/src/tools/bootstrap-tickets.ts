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
    if (!(await columnExists(db, 'atendimentos', 'nome_maquina'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE atendimentos ADD COLUMN nome_maquina VARCHAR(255) NULL AFTER desc_fechamento',
      );
    }

    console.log('Estrutura de atendimentos atualizada.');
    console.log('  atendimentos.nome_maquina: OK');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
