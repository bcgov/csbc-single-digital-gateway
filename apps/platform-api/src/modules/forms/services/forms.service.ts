import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  type Document,
  documentVersions,
  documents,
  workspaceMembers,
  DOCUMENT_TYPE,
} from '@repo/database';
import { withTitle } from '@repo/documents/content';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, desc, eq, sql } from 'drizzle-orm';
import { TemplateResolver } from '../../templates/services/template.resolver';
import { validateContent } from '../../templates/services/validate-content';
import { assertWithinCapabilities } from '../../templates/services/capability-guard';
import {
  type CreateFormInput,
  type FormVersionResponse,
  type FormWithVersion,
  type UpdateFormContentInput,
  toFormDto,
  toFormVersionDto,
} from '../dtos/form.dtos';

/**
 * Application-method documents (feature 217). A "form" is a `documents` row with
 * `type = DOCUMENT_TYPE.applicationMethod`; the caller no longer picks a type id, because the three old form
 * kinds collapsed into one type whose flavour lives in the root of `content.variants` (a `Form` or a `Funnel`).
 */
@Injectable()
export class FormsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly templates: TemplateResolver,
  ) {}

  /** Standalone create: the document + its draft v1 content, in ONE transaction. */
  async create(userId: string, input: CreateFormInput): Promise<FormWithVersion> {
    await this.requireMembership(userId, input.workspaceId);
    const template = await this.templates.forCreate(
      DOCUMENT_TYPE.applicationMethod,
      input.templateId,
    );
    // An explicit content still has to satisfy the type's allowed roots; an omitted one starts
    // from the template with the requested title stamped on every variant (the title column reads default's).
    const content =
      input.content ??
      withTitle({ schema: template.schema, variants: template.variants }, input.title);
    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({
          type: DOCUMENT_TYPE.applicationMethod,
          kind: 'document',
          workspaceId: input.workspaceId,
          templateId: template.templateId,
        })
        .returning();
      const doc = insertedDoc[0];
      if (doc === undefined) {
        throw new Error('document insert returned no row');
      }
      validateContent(doc, content);
      const insertedVersion = await tx
        .insert(documentVersions)
        .values({
          documentId: doc.id,
          templateId: template.templateId,
          templateVersionId: template.templateVersionId,
          versionNumber: 1,
          content,
        })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document version insert returned no row');
      }
      return { form: toFormDto(doc, version), version: toFormVersionDto(version) };
    });
  }

  /** A form document + its latest version. */
  async get(userId: string, id: string): Promise<FormWithVersion> {
    const doc = await this.requireDocument(userId, id);
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id))
      .orderBy(desc(documentVersions.versionNumber))
      .limit(1);
    const latest = rows[0];
    if (latest === undefined) {
      throw new NotFoundException('Form has no versions');
    }
    // Doc 221: the PINNED template, never `forCreate()` — a version authored before a template
    // reshape must render against the template it was authored under, and a governing capability
    // map must not change because a newer template version was published.
    const definition =
      latest.templateVersionId === null
        ? undefined
        : await this.templates.contentForVersion(latest.templateVersionId);
    return {
      form: toFormDto(doc, latest),
      version: toFormVersionDto(latest),
      ...(definition === undefined ? {} : { definition }),
    };
  }

  /** Edit a draft version's content. */
  async updateContent(
    userId: string,
    id: string,
    versionId: string,
    input: UpdateFormContentInput,
  ): Promise<FormVersionResponse> {
    const doc = await this.requireDocument(userId, id);
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, id)))
      .limit(1);
    const version = rows[0];
    if (version === undefined) {
      throw new NotFoundException('Form version not found');
    }
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited');
    }
    const content = validateContent(doc, input.content);
    // Doc 222: the governing template has the final say — the studio's gates are UX, and both the
    // uischema code panel and this endpoint bypass them.
    assertWithinCapabilities(
      version.content,
      content,
      await this.templates.capabilitiesForVersion(version.templateVersionId),
    );
    const updated = await this.db
      .update(documentVersions)
      .set({ content, revision: sql`${documentVersions.revision} + 1` })
      .where(eq(documentVersions.id, versionId))
      .returning();
    const row = updated[0];
    if (row === undefined) {
      throw new NotFoundException('Form version not found');
    }
    return toFormVersionDto(row);
  }

  /** The caller must be a member of the workspace; 404 otherwise (existence not leaked). */
  async requireMembership(userId: string, workspaceId: string): Promise<void> {
    const rows = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (rows[0] === undefined) {
      throw new NotFoundException('Workspace not found');
    }
  }

  /** The document must exist, be an application method, AND the caller be a member of its
   * workspace; 404 otherwise. */
  async requireDocument(userId: string, id: string): Promise<Document> {
    const rows = await this.db
      .select({ doc: documents })
      .from(documents)
      .innerJoin(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, documents.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .where(and(eq(documents.id, id), eq(documents.type, DOCUMENT_TYPE.applicationMethod)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Form not found');
    }
    return row.doc;
  }
}
