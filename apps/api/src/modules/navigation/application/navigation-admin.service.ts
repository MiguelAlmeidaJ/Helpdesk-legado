import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  NavigationAdminItem,
  NavigationAdminItemInput,
  NavigationAdminMutationResponse,
  NavigationAdminResponse,
  NavigationAdminSection,
  NavigationAdminSectionInput,
  NavigationVisibilityCondition,
} from '@helpdesk/contracts';
import type { Nivel3DatabaseClient } from '@helpdesk/database';
import { NIVEL3_DATABASE } from '../../../core/database/database.constants';

type SectionRow = {
  id: number;
  slug: string;
  label: string;
  short_label: string | null;
  sort_order: number;
  is_active: number | boolean;
};

type ItemRow = {
  id: number;
  section_id: number;
  slug: string;
  label: string;
  href: string | null;
  status: string;
  visibility_condition: string | null;
  sort_order: number;
  is_active: number | boolean;
};

function visibilityCondition(raw: string | null): NavigationVisibilityCondition | null {
  if (!raw?.trim()) return null;

  try {
    const value = JSON.parse(raw) as Partial<NavigationVisibilityCondition>;
    return {
      anyPermissions: Array.isArray(value.anyPermissions) ? value.anyPermissions : [],
      allPermissions: Array.isArray(value.allPermissions) ? value.allPermissions : [],
      anyRoles: Array.isArray(value.anyRoles) ? value.anyRoles : [],
    };
  } catch {
    return null;
  }
}

function item(row: ItemRow): NavigationAdminItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    slug: row.slug,
    label: row.label,
    href: row.href,
    status: row.status === 'planned' ? 'planned' : 'available',
    visibilityCondition: visibilityCondition(row.visibility_condition),
    sortOrder: row.sort_order,
    active: Boolean(row.is_active),
  };
}

@Injectable()
export class NavigationAdminService {
  constructor(
    @Inject(NIVEL3_DATABASE)
    private readonly nivel3: Nivel3DatabaseClient,
  ) {}

  async snapshot(): Promise<NavigationAdminResponse> {
    const [sections, items] = await Promise.all([
      this.nivel3.$queryRaw<SectionRow[]>`
        SELECT id, slug, label, short_label, sort_order, is_active
        FROM navigation_sections
        ORDER BY sort_order ASC, id ASC
      `,
      this.nivel3.$queryRaw<ItemRow[]>`
        SELECT id, section_id, slug, label, href, status,
               visibility_condition, sort_order, is_active
        FROM navigation_items
        ORDER BY section_id ASC, sort_order ASC, id ASC
      `,
    ]);

    const itemsBySection = new Map<number, NavigationAdminItem[]>();
    for (const row of items) {
      const list = itemsBySection.get(row.section_id) ?? [];
      list.push(item(row));
      itemsBySection.set(row.section_id, list);
    }

    return {
      sections: sections.map<NavigationAdminSection>((section) => ({
        id: section.id,
        slug: section.slug,
        label: section.label,
        shortLabel: section.short_label,
        sortOrder: section.sort_order,
        active: Boolean(section.is_active),
        items: itemsBySection.get(section.id) ?? [],
      })),
    };
  }

  async createSection(
    input: NavigationAdminSectionInput,
  ): Promise<NavigationAdminMutationResponse> {
    await this.assertSectionSlugAvailable(input.slug);

    await this.nivel3.$executeRaw`
      INSERT INTO navigation_sections (
        slug, label, short_label, sort_order, is_active, created_at, updated_at
      ) VALUES (
        ${input.slug},
        ${input.label},
        ${input.shortLabel},
        ${input.sortOrder},
        ${input.active ? 1 : 0},
        NOW(),
        NOW()
      )
    `;

    const rows = await this.nivel3.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM navigation_sections
      WHERE slug = ${input.slug}
      LIMIT 1
    `;
    const created = rows[0];
    if (!created) throw new NotFoundException('Seção criada, mas não foi possível relê-la.');
    return created;
  }

  async updateSection(
    id: number,
    input: NavigationAdminSectionInput,
  ): Promise<NavigationAdminMutationResponse> {
    const currentSlug = await this.sectionSlug(id);
    if (input.slug !== currentSlug) {
      throw new ConflictException('O slug da seção não pode ser alterado após a criação.');
    }

    await this.nivel3.$executeRaw`
      UPDATE navigation_sections
      SET slug = ${input.slug},
          label = ${input.label},
          short_label = ${input.shortLabel},
          sort_order = ${input.sortOrder},
          is_active = ${input.active ? 1 : 0},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    return { id };
  }

  async createItem(
    input: NavigationAdminItemInput,
  ): Promise<NavigationAdminMutationResponse> {
    await this.assertSectionExists(input.sectionId);
    await this.assertItemSlugAvailable(input.slug);
    const condition = input.visibilityCondition
      ? JSON.stringify(input.visibilityCondition)
      : null;

    await this.nivel3.$executeRaw`
      INSERT INTO navigation_items (
        section_id, slug, label, href, status, visibility_condition,
        sort_order, is_active, created_at, updated_at
      ) VALUES (
        ${input.sectionId},
        ${input.slug},
        ${input.label},
        ${input.href},
        ${input.status},
        ${condition},
        ${input.sortOrder},
        ${input.active ? 1 : 0},
        NOW(),
        NOW()
      )
    `;

    const rows = await this.nivel3.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM navigation_items
      WHERE slug = ${input.slug}
      LIMIT 1
    `;
    const created = rows[0];
    if (!created) throw new NotFoundException('Item criado, mas não foi possível relê-lo.');
    return created;
  }

  async updateItem(
    id: number,
    input: NavigationAdminItemInput,
  ): Promise<NavigationAdminMutationResponse> {
    const currentSlug = await this.itemSlug(id);
    if (input.slug !== currentSlug) {
      throw new ConflictException('O slug do item não pode ser alterado após a criação.');
    }
    await this.assertSectionExists(input.sectionId);
    const condition = input.visibilityCondition
      ? JSON.stringify(input.visibilityCondition)
      : null;

    await this.nivel3.$executeRaw`
      UPDATE navigation_items
      SET section_id = ${input.sectionId},
          slug = ${input.slug},
          label = ${input.label},
          href = ${input.href},
          status = ${input.status},
          visibility_condition = ${condition},
          sort_order = ${input.sortOrder},
          is_active = ${input.active ? 1 : 0},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    return { id };
  }

  private async assertSectionExists(id: number): Promise<void> {
    await this.sectionSlug(id);
  }

  private async sectionSlug(id: number): Promise<string> {
    const rows = await this.nivel3.$queryRaw<Array<{ slug: string }>>`
      SELECT slug FROM navigation_sections WHERE id = ${id} LIMIT 1
    `;
    const row = rows[0];
    if (!row) throw new NotFoundException('Seção de navegação não encontrada.');
    return row.slug;
  }

  private async itemSlug(id: number): Promise<string> {
    const rows = await this.nivel3.$queryRaw<Array<{ slug: string }>>`
      SELECT slug FROM navigation_items WHERE id = ${id} LIMIT 1
    `;
    const row = rows[0];
    if (!row) throw new NotFoundException('Item de navegação não encontrado.');
    return row.slug;
  }

  private async assertSectionSlugAvailable(slug: string, ignoredId?: number): Promise<void> {
    const rows = ignoredId
      ? await this.nivel3.$queryRaw<Array<{ id: number }>>`
          SELECT id
          FROM navigation_sections
          WHERE slug = ${slug} AND id <> ${ignoredId}
          LIMIT 1
        `
      : await this.nivel3.$queryRaw<Array<{ id: number }>>`
          SELECT id
          FROM navigation_sections
          WHERE slug = ${slug}
          LIMIT 1
        `;

    if (rows[0]) throw new ConflictException('Já existe uma seção com este slug.');
  }

  private async assertItemSlugAvailable(slug: string, ignoredId?: number): Promise<void> {
    const rows = ignoredId
      ? await this.nivel3.$queryRaw<Array<{ id: number }>>`
          SELECT id
          FROM navigation_items
          WHERE slug = ${slug} AND id <> ${ignoredId}
          LIMIT 1
        `
      : await this.nivel3.$queryRaw<Array<{ id: number }>>`
          SELECT id
          FROM navigation_items
          WHERE slug = ${slug}
          LIMIT 1
        `;

    if (rows[0]) throw new ConflictException('Já existe um item com este slug.');
  }
}
