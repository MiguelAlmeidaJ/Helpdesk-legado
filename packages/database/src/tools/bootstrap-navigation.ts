import { config } from 'dotenv';
import path from 'node:path';
import { createNivel3Client } from '../index';

config({ path: path.resolve(process.cwd(), '../../.env') });

const CREATE_NAVIGATION_SECTIONS = `
CREATE TABLE IF NOT EXISTS navigation_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  label VARCHAR(150) NOT NULL,
  short_label VARCHAR(20) NULL,
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

async function main() {
  const db = createNivel3Client();

  try {
    await db.$executeRawUnsafe(CREATE_NAVIGATION_SECTIONS);
    await db.$executeRawUnsafe(CREATE_NAVIGATION_ITEMS);

    console.log('Fundação da navegação configurável criada/verificada.');
    console.log('  navigation_sections: OK');
    console.log('  navigation_items: OK');
    console.log('  dados do menu: serão importados no patch de integração do sidebar');
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
