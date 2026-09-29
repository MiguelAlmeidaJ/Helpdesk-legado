import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

type CountRow = { total: number | bigint };

const NATIONAL_HOLIDAYS = [
  ['01-01', 'Confraternização Universal'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia Mundial do Trabalho'],
  ['09-07', 'Independência do Brasil'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra'],
  ['12-25', 'Natal'],
] as const;

function goodFridayDate(year: number): string {
  // Computus gregoriano (Meeus/Jones/Butcher), dois dias antes da Páscoa.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(Date.UTC(year, month - 1, day));
  easter.setUTCDate(easter.getUTCDate() - 2);
  return easter.toISOString().slice(0, 10);
}

const CREATE_SETTINGS = `
CREATE TABLE IF NOT EXISTS business_calendar_settings (
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
CREATE TABLE IF NOT EXISTS business_holidays (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  holiday_date DATE NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_national TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_on_call_holiday_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

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

async function seedNationalHolidays(
  db: ReturnType<typeof createNivel3Client>,
): Promise<void> {
  const currentYear = new Date().getFullYear();

  for (const year of [currentYear, currentYear + 1]) {
    const holidays: Array<readonly [string, string]> = [
      ...NATIONAL_HOLIDAYS.map(
        ([monthDay, name]) => [`${year}-${monthDay}`, name] as const,
      ),
      [goodFridayDate(year), 'Paixão de Cristo'] as const,
    ];

    for (const [date, name] of holidays) {
      await db.$executeRawUnsafe(
        `INSERT INTO business_holidays
           (holiday_date, name, is_national, created_at)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           is_national = 1`,
        date,
        name,
      );
    }
  }
}

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_SETTINGS);
    await db.$executeRawUnsafe(CREATE_SCHEDULE);
    await db.$executeRawUnsafe(CREATE_HOLIDAYS);

    if (!(await columnExists(db, 'business_holidays', 'is_national'))) {
      await db.$executeRawUnsafe(
        'ALTER TABLE business_holidays ADD COLUMN is_national TINYINT(1) NOT NULL DEFAULT 0 AFTER name',
      );
    }

    await seedNationalHolidays(db);

    await db.$executeRawUnsafe(
      `INSERT INTO business_calendar_settings (id, business_start, business_end)
       VALUES (1, '07:00:00', '19:00:00')
       ON DUPLICATE KEY UPDATE id = VALUES(id)`,
    );

    await db.$executeRawUnsafe(
      `INSERT IGNORE INTO roles
         (name, slug, description, is_system, sort_order, created_at, updated_at)
       VALUES (
         'Plantonista',
         'plantonista',
         'Permissões temporárias concedidas apenas durante o plantão ativo.',
         1,
         9990,
         NOW(),
         NOW()
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
    console.log('  business_calendar_settings: OK (07:00 - 19:00)');
    console.log('  on_call_schedules: OK');
    console.log('  business_holidays: OK');
    console.log('  feriados nacionais: ano atual + próximo ano');
    console.log('  perfil Plantonista: OK');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
