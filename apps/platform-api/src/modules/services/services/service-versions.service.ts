import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type Database, type DocumentVersion, documentVersions, documents } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';
import { type ServiceVersionResponse, toServiceVersionDto } from '../dtos/service.dtos';
import { validateData } from '../util/validate-data';
import { ServiceTypeResolver } from './service-type.resolver';
import { ServicesService } from './services.service';

@Injectable()
export class ServiceVersionsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
    private readonly serviceType: ServiceTypeResolver,
  ) {}

  /** Save a draft version's form data; sync the document title from `data.title`. Drafts only (409). */
  async updateDraft(
    userId: string,
    id: string,
    versionId: string,
    data: Record<string, unknown>,
  ): Promise<ServiceVersionResponse> {
    await this.services.requireDocument(userId, id);
    const version = await this.requireVersion(id, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited');
    }
    const updated = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(documentVersions)
        .set({ data })
        .where(eq(documentVersions.id, versionId))
        .returning();
      const title = data.title;
      if (typeof title === 'string' && title.trim() !== '') {
        await tx.update(documents).set({ title }).where(eq(documents.id, id));
      }
      return rows[0];
    });
    return toServiceVersionDto(this.orThrow(updated));
  }

  /** Validate the draft against its bound type-version schema (422 if invalid), then publish it. */
  async publish(userId: string, id: string, versionId: string): Promise<ServiceVersionResponse> {
    await this.services.requireDocument(userId, id);
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
      const schema = await this.serviceType.schemaForVersion(version.typeVersionId);
      const result = validateData(schema, version.data);
      if (!result.valid) {
        throw new UnprocessableEntityException({
          message: 'Service data failed validation',
          errors: result.errors,
        });
      }
      // Demote the currently-published version, then promote this draft (≤1 published per document).
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
      throw new ConflictException('Version is already archived');
    }
    const archived = await this.db
      .update(documentVersions)
      .set({ archivedAt: sql`now()` })
      .where(eq(documentVersions.id, versionId))
      .returning();
    return toServiceVersionDto(this.orThrow(archived[0]));
  }

  /** Add a new draft version (seeded from the latest version's data; binds to the current published type). */
  async addVersion(userId: string, id: string): Promise<ServiceVersionResponse> {
    await this.services.requireDocument(userId, id);
    const type = await this.serviceType.resolve();
    return this.db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, id))
        .orderBy(sql`${documentVersions.version} desc`)
        .limit(1);
      const latest = existing[0];
      const next = (latest?.version ?? 0) + 1;
      const inserted = await tx
        .insert(documentVersions)
        .values({
          documentId: id,
          typeId: type.typeId,
          typeVersionId: type.typeVersionId,
          version: next,
          data: latest?.data ?? {},
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
