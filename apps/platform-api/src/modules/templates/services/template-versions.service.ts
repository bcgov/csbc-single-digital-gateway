import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Database, type Document, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';
import { type TemplateVersionResponse, toTemplateVersionDto } from '../dtos/template.dtos';
import { assertPublishable, validateContent } from './validate-content';

/**
 * The version lifecycle for TEMPLATES (feature 217), carried over from the old
 * `DocumentTypeVersionsService`: add a draft, edit it, publish it (demote-then-promote,
 * which the partial unique index forces), archive it. Deleting moved to `TemplateLifecycleService` (doc 227), which checks references.
 */
@Injectable()
export class TemplateVersionsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Add a new draft version (content validated against the template's type). */
  async addVersion(id: string, content: unknown): Promise<TemplateVersionResponse> {
    const template = await this.requireTemplate(id);
    const parsed = validateContent(template, content);
    return this.db.transaction(async (tx) => {
      const maxRows = await tx
        .select({ max: sql<number>`coalesce(max(${documentVersions.versionNumber}), 0)` })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, id));
      const next = (maxRows[0]?.max ?? 0) + 1;
      const inserted = await tx
        .insert(documentVersions)
        .values({ documentId: id, versionNumber: next, content: parsed })
        .returning();
      return toTemplateVersionDto(firstOrThrow(inserted));
    });
  }

  /** Edit a draft version's content (drafts only → 409). */
  async editDraft(
    id: string,
    versionId: string,
    content: unknown,
  ): Promise<TemplateVersionResponse> {
    const { template, version } = await this.requireVersion(id, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited');
    }
    const parsed = validateContent(template, content);
    const updated = await this.db
      .update(documentVersions)
      .set({ content: parsed, revision: sql`${documentVersions.revision} + 1` })
      .where(eq(documentVersions.id, versionId))
      .returning();
    return toTemplateVersionDto(firstOrThrow(updated));
  }

  /**
   * Publish a draft. The currently-published version is archived FIRST: the partial unique index
   * `document_versions_one_published_key` is not deferrable, so promote-then-demote would collide
   * inside the transaction.
   */
  async publish(id: string, versionId: string): Promise<TemplateVersionResponse> {
    const template = await this.requireTemplate(id);
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(documentVersions)
        .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)))
        .limit(1);
      const version = rows[0];
      if (version === undefined) {
        throw new NotFoundException('Template version not found');
      }
      if (version.status !== 'draft') {
        throw new ConflictException('Only draft versions can be published');
      }
      assertPublishable(validateContent(template, version.content));
      await tx
        .update(documentVersions)
        .set({ archivedAt: sql`now()` })
        .where(and(eq(documentVersions.documentId, id), eq(documentVersions.status, 'published')));
      const published = await tx
        .update(documentVersions)
        .set({ publishedAt: sql`now()` })
        .where(eq(documentVersions.id, versionId))
        .returning();
      return toTemplateVersionDto(firstOrThrow(published));
    });
  }

  /** Archive a published version. */
  async archive(id: string, versionId: string): Promise<TemplateVersionResponse> {
    const { version } = await this.requireVersion(id, versionId);
    if (version.status !== 'published') {
      throw new ConflictException('Only published versions can be archived');
    }
    const archived = await this.db
      .update(documentVersions)
      .set({ archivedAt: sql`now()` })
      .where(eq(documentVersions.id, versionId))
      .returning();
    return toTemplateVersionDto(firstOrThrow(archived));
  }

  private async requireTemplate(id: string): Promise<Document> {
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

  private async requireVersion(id: string, versionId: string) {
    const template = await this.requireTemplate(id);
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)))
      .limit(1);
    const version = rows[0];
    if (version === undefined) {
      throw new NotFoundException('Template version not found');
    }
    return { template, version };
  }
}

function firstOrThrow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error('expected a returned row');
  }
  return row;
}
