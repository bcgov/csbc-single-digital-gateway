import { Injectable, NotFoundException } from '@nestjs/common';
import { type Database, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, eq, ne } from 'drizzle-orm';
import {
  type TemplateDetail,
  type TemplatePublished,
  type TemplateVersionResponse,
  type TemplateWithVersions,
  toTemplateDto,
  toTemplateVersionDto,
} from '../dtos/template.dtos';

/**
 * Read paths over TEMPLATES — `documents` rows with `kind = 'template'` (feature 217). Creating and
 * deleting a template is `TemplateLifecycleService` (doc 227).
 */
@Injectable()
export class TemplatesService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Admin: every template with every version, drafts included. */
  async adminList(): Promise<TemplateWithVersions[]> {
    const rows = await this.db
      .select()
      .from(documents)
      .where(eq(documents.kind, 'template'))
      .orderBy(asc(documents.type));
    return Promise.all(
      rows.map(async (row) => ({
        template: toTemplateDto(row),
        versions: await this.versionsFor(row.id),
      })),
    );
  }

  /** Admin: one template with every version, drafts included. */
  async adminGet(id: string): Promise<TemplateWithVersions> {
    const template = await this.requireTemplate(id);
    return { template: toTemplateDto(template), versions: await this.versionsFor(id) };
  }

  /** Staff: the catalog — every template that has a published version. */
  async staffList(): Promise<TemplatePublished[]> {
    const rows = await this.db
      .select({ template: documents, published: documentVersions })
      .from(documents)
      .innerJoin(
        documentVersions,
        and(
          eq(documentVersions.documentId, documents.id),
          eq(documentVersions.status, 'published'),
        ),
      )
      .where(eq(documents.kind, 'template'))
      .orderBy(asc(documents.type));
    return rows.map((row) => ({
      template: toTemplateDto(row.template),
      published: toTemplateVersionDto(row.published),
    }));
  }

  /** Staff: one template, its published version, and its non-draft history. */
  async staffGet(id: string): Promise<TemplateDetail> {
    const template = await this.requireTemplate(id);
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.documentId, id), ne(documentVersions.status, 'draft')))
      .orderBy(asc(documentVersions.versionNumber));
    const versions = rows.map(toTemplateVersionDto);
    return {
      template: toTemplateDto(template),
      published: versions.find((v) => v.status === 'published') ?? null,
      history: versions,
    };
  }

  /** Staff: one non-draft version. A draft 404s — it is not part of the published catalog. */
  async staffGetVersion(id: string, versionId: string): Promise<TemplateVersionResponse> {
    await this.requireTemplate(id);
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.id, versionId),
          eq(documentVersions.documentId, id),
          ne(documentVersions.status, 'draft'),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Template version not found');
    }
    return toTemplateVersionDto(row);
  }

  private async versionsFor(id: string): Promise<TemplateVersionResponse[]> {
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id))
      .orderBy(asc(documentVersions.versionNumber));
    return rows.map(toTemplateVersionDto);
  }

  private async requireTemplate(id: string) {
    const rows = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.kind, 'template')))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Template not found');
    }
    return row;
  }
}
