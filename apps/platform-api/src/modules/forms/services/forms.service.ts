import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type Database,
  type Document,
  documentTypeVersions,
  documentTypes,
  documentVersions,
  documents,
  workspaceMembers,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, desc, eq } from 'drizzle-orm';
import {
  type CreateFormInput,
  type FormVersionResponse,
  type FormWithVersion,
  type UpdateFormSchemaInput,
  toFormDto,
  toFormVersionDto,
} from '../dtos/form.dtos';

const FORM_KINDS = new Set(['basic-form', 'multi-stage-form']);

@Injectable()
export class FormsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Standalone create: the form document + its draft v1 definition, in ONE transaction. */
  async create(userId: string, input: CreateFormInput): Promise<FormWithVersion> {
    await this.requireMembership(userId, input.workspaceId);
    const type = await this.resolveType(input.typeId);
    return this.db.transaction(async (tx) => {
      const insertedDoc = await tx
        .insert(documents)
        .values({
          typeId: type.typeId,
          workspaceId: input.workspaceId,
          kind: type.kind,
          title: input.title,
        })
        .returning();
      const doc = insertedDoc[0];
      if (doc === undefined) {
        throw new Error('document insert returned no row');
      }
      const insertedVersion = await tx
        .insert(documentVersions)
        .values({
          documentId: doc.id,
          typeId: type.typeId,
          typeVersionId: type.typeVersionId,
          version: 1,
          schema: input.definition,
          data: {},
        })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document version insert returned no row');
      }
      return { form: toFormDto(doc), version: toFormVersionDto(version) };
    });
  }

  /** A form document + its latest version. */
  async get(userId: string, id: string): Promise<FormWithVersion> {
    const doc = await this.requireDocument(userId, id);
    const rows = await this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, id))
      .orderBy(desc(documentVersions.version))
      .limit(1);
    const latest = rows[0];
    if (latest === undefined) {
      throw new NotFoundException('Form has no versions');
    }
    return { form: toFormDto(doc), version: toFormVersionDto(latest) };
  }

  /** Edit a draft version's definition (and optionally retitle the document). */
  async updateSchema(
    userId: string,
    id: string,
    versionId: string,
    input: UpdateFormSchemaInput,
  ): Promise<FormVersionResponse> {
    await this.requireDocument(userId, id);
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
    const updated = await this.db
      .update(documentVersions)
      .set({ schema: input.definition })
      .where(eq(documentVersions.id, versionId))
      .returning();
    if (input.title !== undefined) {
      await this.db.update(documents).set({ title: input.title }).where(eq(documents.id, id));
    }
    const row = updated[0];
    if (row === undefined) {
      throw new NotFoundException('Form version not found');
    }
    return toFormVersionDto(row);
  }

  /** Resolve a published form type-version by id; reject non-form kinds. */
  private async resolveType(
    typeId: string,
  ): Promise<{ typeId: string; typeVersionId: string; kind: string }> {
    const rows = await this.db
      .select({
        typeId: documentTypes.id,
        typeVersionId: documentTypeVersions.id,
        kind: documentTypes.kind,
      })
      .from(documentTypes)
      .innerJoin(
        documentTypeVersions,
        and(
          eq(documentTypeVersions.typeId, documentTypes.id),
          eq(documentTypeVersions.status, 'published'),
        ),
      )
      .where(eq(documentTypes.id, typeId))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new UnprocessableEntityException('Form type not found or has no published version');
    }
    if (!FORM_KINDS.has(row.kind)) {
      throw new BadRequestException('A form must be a basic-form or multi-stage-form type');
    }
    return { typeId: row.typeId, typeVersionId: row.typeVersionId, kind: row.kind };
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

  /** The document must exist AND the caller be a member of its workspace; 404 otherwise. */
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
      .where(eq(documents.id, id))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Form not found');
    }
    return row.doc;
  }
}
