import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

const CREATE_NOTIFICATION_STATES = `
CREATE TABLE IF NOT EXISTS notification_states (
  user_id INT NOT NULL,
  notification_key VARCHAR(190) NOT NULL,
  read_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notification_key),
  KEY idx_notification_states_user_read (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_NOTIFICATION_STATES);
    console.log('Central de notificações criada/verificada.');
    console.log('  notification_states: OK');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
