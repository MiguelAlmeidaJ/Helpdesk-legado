import { DEFAULT_NAVIGATION } from '@helpdesk/contracts';
import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';
import { synchronizeNavigation } from '../navigation/synchronize-navigation';

config({ path: path.resolve(process.cwd(), '../../.env') });

const CREATE_NAVIGATION_SECTIONS = `
CREATE TABLE IF NOT EXISTS navigation_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  short_label VARCHAR(20) NULL,
  icon VARCHAR(50) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_navigation_sections_slug (slug),
  KEY idx_navigation_sections_order (is_active, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const CREATE_NAVIGATION_ITEMS = `
CREATE TABLE IF NOT EXISTS navigation_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_id INT UNSIGNED NOT NULL,
  slug VARCHAR(120) NOT NULL,
  label VARCHAR(160) NOT NULL,
  icon VARCHAR(50) NULL,
  href VARCHAR(500) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'planned',
  visibility_condition LONGTEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_navigation_items_slug (slug),
  KEY idx_navigation_items_section_order (section_id, is_active, sort_order, id),
  CONSTRAINT fk_navigation_items_section
    FOREIGN KEY (section_id)
    REFERENCES navigation_sections(id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

type SectionRow = { id: number | bigint; slug: string };
type CountRow = { total: number | bigint };

async function ensureIconColumns(db: ReturnType<typeof createNivel3Client>) {
  async function columnExists(table: string): Promise<boolean> {
    const rows = await db.$queryRawUnsafe<CountRow[]>(
      `SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'icon'`,
      table,
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  if (!(await columnExists('navigation_sections'))) {
    await db.$executeRawUnsafe('ALTER TABLE navigation_sections ADD COLUMN icon VARCHAR(50) NULL AFTER short_label');
  }
  if (!(await columnExists('navigation_items'))) {
    await db.$executeRawUnsafe('ALTER TABLE navigation_items ADD COLUMN icon VARCHAR(50) NULL AFTER label');
  }
}

async function seedNavigation(db: Pick<ReturnType<typeof createNivel3Client>, '$queryRaw' | '$executeRaw'>) {
  for (const [sectionIndex, section] of DEFAULT_NAVIGATION.entries()) {
    await db.$executeRaw`
      INSERT IGNORE INTO navigation_sections (
        slug, label, short_label, icon, sort_order, is_active, created_at, updated_at
      ) VALUES (
        ${section.slug}, ${section.label}, ${section.shortLabel}, ${section.icon}, ${sectionIndex * 10}, 1, NOW(), NOW()
      )
    `;
  }

  const rows = await db.$queryRaw<SectionRow[]>`
    SELECT id, slug FROM navigation_sections
  `;
  const sectionIds = new Map(rows.map((row) => [row.slug, Number(row.id)]));

  for (const section of DEFAULT_NAVIGATION) {
    const sectionId = sectionIds.get(section.slug);
    await db.$executeRaw`
      UPDATE navigation_sections
      SET icon = ${section.icon}
      WHERE slug = ${section.slug} AND (icon IS NULL OR icon = '')
    `;
    if (!sectionId) throw new Error(`Seção de navegação ${section.slug} não encontrada.`);

    for (const [itemIndex, item] of section.items.entries()) {
      const visibilityCondition = item.visibilityCondition
        ? JSON.stringify(item.visibilityCondition)
        : null;

      await db.$executeRaw`
        INSERT IGNORE INTO navigation_items (
          section_id,
          slug,
          label,
          icon,
          href,
          status,
          visibility_condition,
          sort_order,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${sectionId},
          ${item.slug},
          ${item.label},
          ${item.icon ?? section.icon},
          ${item.href ?? null},
          ${item.status},
          ${visibilityCondition},
          ${itemIndex * 10},
          1,
          NOW(),
          NOW()
        )
      `;

      await db.$executeRaw`
        UPDATE navigation_items
        SET icon = ${item.icon ?? section.icon}
        WHERE slug = ${item.slug} AND (icon IS NULL OR icon = '')
      `;
    }
  }
}

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_NAVIGATION_SECTIONS);
    await db.$executeRawUnsafe(CREATE_NAVIGATION_ITEMS);
    await ensureIconColumns(db);
    const updated = await db.$transaction(async (tx) => {
      await seedNavigation(tx);
      return synchronizeNavigation(tx);
    }, { timeout: 30_000 });

    console.log('Navegação configurável criada/verificada.');
    console.log('  navigation_sections: OK');
    console.log('  navigation_items: OK');
    console.log('  menu inicial: importado de forma idempotente');
    console.log(`  links e telas migradas: ${updated} itens atualizados`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
