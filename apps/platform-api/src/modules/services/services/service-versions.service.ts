import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Database, type DocumentVersion, documentVersions } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';
import { TemplateResolver } from '../../templates/services/template.resolver';
import { validateContent } from '../../templates/services/validate-content';
import {
  type ServiceVersionResponse,
  type UpdateVersionContentInput,
  toServiceVersionDto,
} from '../dtos/service.dtos';
import { discardVersionTx } from '../util/version-copy';
import { ServicesService } from './services.service';

/**
 * The version lifecycle for SERVICE documents.
 *
 * Feature 217: a draft save now writes one `content` (the authored document) instead of `data` +
 * a reconciled set of application references, and the title is no longer synced onto the document
 * row — `documents.title` is gone and `document_versions.title` is GENERATED from the content.
 * Publish validates the content's shape; it no longer validates filled VALUES against the
 * template's JSON schema, because a service has no values to fill, and it no longer gates on
 * "≥ 1 application method", which needed `document_references`.
 */
@Injectable()
export class ServiceVersionsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
    private readonly templates: TemplateResolver,
  ) {}

  /** Save a draft version's content. Drafts only. */
  async updateDraft(
    userId: string,
    id: string,
    versionId: string,
    input: UpdateVersionContentInput,
  ): Promise<ServiceVersionResponse> {
    const service = await this.services.requireDocument(userId, id);
    const version = await this.requireVersion(id, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited');
    }
    const content = validateContent(service, input.content);
    const rows = await this.db
      .update(documentVersions)
      .set({ content, revision: sql`${documentVersions.revision} + 1` })
      .where(eq(documentVersions.id, versionId))
      .returning();
    return toServiceVersionDto(this.orThrow(rows[0]));
  }

  /**
   * Publish a draft. The currently-published version is archived FIRST: the partial unique index
   * `document_versions_one_published_key` is not deferrable, so promote-then-demote would collide
   * inside the transaction.
   */
  async publish(userId: string, id: string, versionId: string): Promise<ServiceVersionResponse> {
    const service = await this.services.requireDocument(userId, id);
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(documentVersions)
        .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)))
        .limit(1);
      const version = rows[0];
      if (version === undefined) {
        throw new NotFoundException('Service version not found');
      }
      if (version.status !== 'draft') {
        throw new ConflictException('Only draft versions can be published');
      }
      validateContent(service, version.content);
      await tx
        .update(documentVersions)
        .set({ archivedAt: sql`now()` })
        .where(and(eq(documentVersions.documentId, id), eq(documentVersions.status, 'published')));
      const published = await tx
        .update(documentVersions)
        .set({ publishedAt: sql`now()` })
        .where(eq(documentVersions.id, versionId))
        .returning();
      return toServiceVersionDto(this.orThrow(published[0]));
    });
  }

  /** Archive a version (any non-archived → archived). */
  async archive(userId: string, id: string, versionId: string): Promise<ServiceVersionResponse> {
    await this.services.requireDocument(userId, id);
    const version = await this.requireVersion(id, versionId);
    if (version.status === 'archived') {
      throw new ConflictException('This version is already archived');
    }
    const rows = await this.db
      .update(documentVersions)
      .set({ archivedAt: sql`now()` })
      .where(eq(documentVersions.id, versionId))
      .returning();
    return toServiceVersionDto(this.orThrow(rows[0]));
  }

  /** Discard a DRAFT version. Refuses the last remaining version — delete the service instead. */
  async discardVersion(userId: string, id: string, versionId: string): Promise<void> {
    await this.services.requireDocument(userId, id);
    const version = await this.requireVersion(id, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be discarded');
    }
    await this.db.transaction((tx) => discardVersionTx(tx, id, versionId));
  }

  /** Add a new draft version, copying the latest version's content. */
  async addVersion(userId: string, id: string): Promise<ServiceVersionResponse> {
    await this.services.requireDocument(userId, id);
    const template = await this.templates.resolve('service');
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, id))
        .orderBy(sql`${documentVersions.versionNumber} desc`)
        .limit(1);
      const latest = existing[0];
      const next = (latest?.versionNumber ?? 0) + 1;
      const inserted = await tx
        .insert(documentVersions)
        .values({
          documentId: id,
          templateId: template.templateId,
          templateVersionId: template.templateVersionId,
          versionNumber: next,
          content: latest?.content ?? { schema: template.schema, uischema: template.uischema },
        })
        .returning();
      return toServiceVersionDto(this.orThrow(inserted[0]));
    });
  }

  private orThrow(row: DocumentVersion | undefined): DocumentVersion {
    if (row === undefined) {
      throw new Error('document version mutation returned no row');
    }
    return row;
  }

  private async requireVersion(documentId: string, versionId: string): Promise<DocumentVersion> {
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Service version not found');
    }
    return row;
  }
}
