import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Database, type DocumentVersion, documentVersions } from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';
import { answerErrors } from '../util/validate-answers';
import { TemplateResolver } from '../../templates/services/template.resolver';
import { assertPublishable, validateContent } from '../../templates/services/validate-content';
import { assertWithinCapabilities } from '../../templates/services/capability-guard';
import {
  type ServiceVersionResponse,
  type UpdateVersionContentInput,
  toServiceVersionDto,
} from '../dtos/service.dtos';
import { publishRefusal } from '../util/method-checks';
import { discardVersionTx } from '../util/version-copy';
import { ServiceMethodsService } from './service-methods.service';
import { ServicesService } from './services.service';

/**
 * The version lifecycle for SERVICE documents.
 *
 * Feature 217: a draft save now writes one `content` (the authored document) instead of `data` +
 * a reconciled set of application references, and the title is no longer synced onto the document
 * row — `documents.title` is gone and `document_versions.title` is GENERATED from the content.
 * Publish validates the content's shape; it no longer validates filled VALUES against the
 * template's JSON schema, because a service has no values to fill.
 *
 * Doc 289: publish gates on the service's application methods again — read from its document-reference answers, not
 * `document_references` — and publish, new version and discard carry those methods in the same transaction.
 */
@Injectable()
export class ServiceVersionsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly services: ServicesService,
    private readonly templates: TemplateResolver,
    private readonly methods: ServiceMethodsService,
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
    const document = validateContent(service, input.content);
    // Doc 230: `validateContent` parses the DOCUMENT and drops `data`, so the answers are re-attached
    // here — the new ones when sent, otherwise the stored ones (a document-only save never wipes them).
    const data = input.content.data ?? storedAnswers(version.content);
    const content = data === undefined ? document : { ...document, data };
    // Doc 222: the governing template has the final say — the studio's gates are UX, and both the
    // uischema code panel and this endpoint bypass them.
    assertWithinCapabilities(
      version.content,
      content,
      await this.templates.capabilitiesForVersion(version.templateVersionId),
    );
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
      const document = validateContent(service, version.content);
      assertPublishable(document);
      // Doc 230: never publish answers the service's own form rejects.
      const problems = answerErrors(document.schema, storedAnswers(version.content) ?? {});
      if (problems.length > 0) {
        throw new BadRequestException(`Answers don't match the form: ${problems.join('; ')}`);
      }
      // Doc 289 rule 7: the precheck again, inside the transaction — the dialog's result is never trusted.
      const refusal = publishRefusal(await this.methods.check(tx, service, version));
      if (refusal !== undefined) throw new BadRequestException(refusal);
      await tx
        .update(documentVersions)
        .set({ archivedAt: sql`now()` })
        .where(and(eq(documentVersions.documentId, id), eq(documentVersions.status, 'published')));
      const published = await tx
        .update(documentVersions)
        .set({ publishedAt: sql`now()` })
        .where(eq(documentVersions.id, versionId))
        .returning();
      // Doc 289 rule 8: the service's draft application methods go live with it.
      await this.methods.publishMethodsTx(tx, service, version.content);
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
    const service = await this.services.requireDocument(userId, id);
    const version = await this.requireVersion(id, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be discarded');
    }
    await this.db.transaction(async (tx) => {
      // Doc 289 rule 14: first the method drafts this version brought with it.
      await this.methods.discardMethodDraftsTx(tx, service, version.content);
      await discardVersionTx(tx, id, versionId);
    });
  }

  /** Add a new draft version, copying the latest version's content. */
  async addVersion(userId: string, id: string): Promise<ServiceVersionResponse> {
    const service = await this.services.requireDocument(userId, id);
    // Doc 228: the document's OWN template — the version FK requires the same template_id.
    const template = await this.templates.forDocument(service.templateId);
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
          content: latest?.content ?? { schema: template.schema, variants: template.variants },
        })
        .returning();
      const created = this.orThrow(inserted[0]);
      // Doc 289 rule 12: each of its application methods gets a draft to edit with it.
      await this.methods.draftMethodsTx(tx, service, created.content);
      return toServiceVersionDto(created);
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

/** Doc 230: the staff answers a stored version carries, when it carries any. */
function storedAnswers(content: unknown): Record<string, unknown> | undefined {
  const data = (content as { data?: unknown } | null)?.data;
  return typeof data === 'object' && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : undefined;
}
