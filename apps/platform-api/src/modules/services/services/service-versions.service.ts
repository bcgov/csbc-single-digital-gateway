import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  type DocumentVersion,
  documentReferences,
  documentVersions,
  documents,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';
import {
  type ApplicationInput,
  type ServiceVersionResponse,
  type UpdateVersionDataInput,
  toServiceVersionDto,
} from '../dtos/service.dtos';
import {
  type ResolvedApplication,
  type Tx,
  formHasStructure,
  insertApplication,
  resolveApplications,
} from '../util/applications';
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

  /**
   * Composite save of a draft version: form data + title sync, and (when `applications` is given)
   * reconcile the version's application references — add new, relabel/reorder kept, remove dropped
   * (a form's last reference can't be removed → 409). Drafts only.
   */
  async updateDraft(
    userId: string,
    id: string,
    versionId: string,
    input: UpdateVersionDataInput,
  ): Promise<ServiceVersionResponse> {
    const service = await this.services.requireDocument(userId, id);
    const version = await this.requireVersion(id, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited');
    }
    // Pre-resolve NEW applications (no id) before opening the write tx.
    const newApps = (input.applications ?? []).filter((app) => app.id === undefined);
    const resolvedNew = await resolveApplications(this.db, id, service.workspaceId, newApps);

    const updated = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(documentVersions)
        .set({ data: input.data })
        .where(eq(documentVersions.id, versionId))
        .returning();
      const title =
        input.title ?? (typeof input.data.title === 'string' ? input.data.title : undefined);
      if (title !== undefined && title.trim() !== '') {
        await tx.update(documents).set({ title }).where(eq(documents.id, id));
      }
      if (input.applications !== undefined) {
        await this.reconcileApplications(
          tx,
          { ownerVersionId: versionId, ownerDocumentId: id, workspaceId: service.workspaceId },
          input.applications,
          resolvedNew,
        );
      }
      return rows[0];
    });
    return toServiceVersionDto(this.orThrow(updated));
  }

  private async reconcileApplications(
    tx: Tx,
    owner: { ownerVersionId: string; ownerDocumentId: string; workspaceId: string },
    incoming: ApplicationInput[],
    resolvedNew: ResolvedApplication[],
  ): Promise<void> {
    const existing = await tx
      .select()
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.ownerVersionId, owner.ownerVersionId),
          eq(documentReferences.relation, 'application_form'),
        ),
      );
    const keptIds = new Set(incoming.map((app) => app.id).filter((appId) => appId !== undefined));

    // Remove dropped references (a form's last reference is protected). Sequential — one tx connection.
    for (const ref of existing) {
      if (keptIds.has(ref.id)) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const counts = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(documentReferences)
        .where(eq(documentReferences.targetDocumentId, ref.targetDocumentId));
      if ((counts[0]?.n ?? 0) <= 1) {
        throw new ConflictException('A form must be referenced by at least one service');
      }
      // eslint-disable-next-line no-await-in-loop
      await tx.delete(documentReferences).where(eq(documentReferences.id, ref.id));
    }

    // Relabel/reorder kept references.
    const existingIds = new Set(existing.map((ref) => ref.id));
    for (const app of incoming) {
      if (app.id !== undefined && existingIds.has(app.id)) {
        // eslint-disable-next-line no-await-in-loop
        await tx
          .update(documentReferences)
          .set({ label: app.label, position: app.position })
          .where(eq(documentReferences.id, app.id));
      }
    }

    // Insert new applications (creating inline forms as needed).
    for (const app of resolvedNew) {
      // eslint-disable-next-line no-await-in-loop
      await insertApplication(tx, owner, app);
    }
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
      // A service must have ≥1 application method, and every method's form must have structure.
      const apps = await tx
        .select({
          targetVersionId: documentReferences.targetVersionId,
          targetKind: documentReferences.targetKind,
          targetSchema: documentVersions.schema,
          targetTitle: documents.title,
        })
        .from(documentReferences)
        .innerJoin(documentVersions, eq(documentVersions.id, documentReferences.targetVersionId))
        .innerJoin(documents, eq(documents.id, documentReferences.targetDocumentId))
        .where(
          and(
            eq(documentReferences.ownerVersionId, versionId),
            eq(documentReferences.relation, 'application_form'),
          ),
        );
      if (apps.length === 0) {
        throw new UnprocessableEntityException({
          message: 'A service must have at least one application method to publish',
          errors: [],
        });
      }
      const structureless = apps
        .filter((app) => !formHasStructure(app.targetKind, app.targetSchema))
        .map((app) => app.targetTitle);
      if (structureless.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Every application method needs fields before the service can be published',
          errors: structureless,
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
      // Publishing a service publishes its application forms (one version each).
      for (const app of apps) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
        await tx
          .update(documentVersions)
          .set({ publishedAt: sql`now()`, archivedAt: null })
          .where(eq(documentVersions.id, app.targetVersionId));
      }
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
