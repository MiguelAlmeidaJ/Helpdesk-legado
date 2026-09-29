import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

const CREATE_SETTINGS = `
CREATE TABLE IF NOT EXISTS on_call_settings (
  id TINYINT UNSIGNED NOT NULL,
  business_start TIME NOT NULL DEFAULT '07:00:00',
  business_end TIME NOT NULL DEFAULT '19:00:00',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const CREATE_SCHEDULE = `
CREATE TABLE IF NOT EXISTS on_call_schedules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  week_start DATE NOT NULL,
  area VARCHAR(20) NOT NULL,
  user_id INT NOT NULL,
  assigned_by INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_on_call_week_area (week_start, area),
  KEY idx_on_call_user_week (user_id, week_start),
  CONSTRAINT fk_on_call_user
    FOREIGN KEY (user_id) REFERENCES usuarios(user_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_on_call_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES usuarios(user_id)
    ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const CREATE_HOLIDAYS = `
CREATE TABLE IF NOT EXISTS on_call_holidays (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  holiday_date DATE NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_on_call_holiday_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_SETTINGS);
    await db.$executeRawUnsafe(CREATE_SCHEDULE);
    await db.$executeRawUnsafe(CREATE_HOLIDAYS);

    await db.$executeRawUnsafe(
      `INSERT INTO on_call_settings (id, business_start, business_end)
       VALUES (1, '07:00:00', '19:00:00')
       ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    );

    await db.$executeRawUnsafe(
      `INSERT INTO roles
         (name, slug, description, is_system, sort_order, created_at, updated_at)
       SELECT
         'Plantonista',
         'plantonista',
         'Permissões temporárias concedidas apenas durante o plantão ativo.',
         1,
         next_role.next_order,
         NOW(),
         NOW()
       FROM (
         SELECT COALESCE(MAX(sort_order), 0) + 10 AS next_order
         FROM roles
       ) next_role
       WHERE NOT EXISTS (
         SELECT 1 FROM roles WHERE slug = 'plantonista'
       )`,
    );

    await db.$executeRawUnsafe(
      `UPDATE roles
       SET name = 'Plantonista',
           description = 'Permissões temporárias concedidas apenas durante o plantão ativo.',
           is_system = 1,
           updated_at = NOW()
       WHERE slug = 'plantonista'`,
    );

    // O perfil é sempre dinâmico; remove eventual vínculo permanente criado manualmente.
    await db.$executeRawUnsafe(
      `DELETE ur
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE r.slug = 'plantonista'`,
    );

    console.log('Estrutura de plantão criada/verificada.');
    console.log('  on_call_settings: OK (07:00 - 19:00)');
    console.log('  on_call_schedules: OK');
    console.log('  on_call_holidays: OK');
    console.log('  perfil Plantonista: OK');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
