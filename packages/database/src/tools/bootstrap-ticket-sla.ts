import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

const CREATE_RULES = `
CREATE TABLE IF NOT EXISTS ticket_sla_rules (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  client_id INT NULL,
  category_id INT NULL,
  priority INT NULL,
  quality_minutes INT NOT NULL,
  clerio_minutes INT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_sla_rules_active_order (active, sort_order),
  KEY idx_ticket_sla_rules_client (client_id),
  KEY idx_ticket_sla_rules_category (category_id),
  KEY idx_ticket_sla_rules_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_RULES);
    console.log('Motor de SLA criado/verificado.');
    console.log('  ticket_sla_rules: OK');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
