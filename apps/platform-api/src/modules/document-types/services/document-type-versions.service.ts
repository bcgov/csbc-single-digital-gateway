import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Database,
  type DocumentType,
  documentTypes,
  documentTypeVersions,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  type DocumentTypeVersionResponse,
  definitionForKind,
  documentKindSchema,
  toVersionDto,
} from '../dtos/document-type.dtos';

/** Validate a definition against the type's kind (throws 400). */
function validateDefinition(kind: string, definition: Record<string, unknown>): void {
  const parsedKind = documentKindSchema.safeParse(kind);
  if (!parsedKind.success) {
    throw new BadRequestException(`Unknown document type kind "${kind}"`);
  }
  const result = definitionForKind(parsedKind.data).safeParse(definition);
  if (!result.success) {
    throw new BadRequestException(z.prettifyError(result.error));
  }
}

@Injectable()
export class DocumentTypeVersionsService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Add a new draft version (definition validated against the type's kind). */
  async addVersion(
    typeId: string,
    definition: Record<string, unknown>,
  ): Promise<DocumentTypeVersionResponse> {
    const type = await this.requireType(typeId);
    validateDefinition(type.kind, definition);
    return this.db.transaction(async (tx) => {
      const maxRows = await tx
        .select({ max: sql<number>`coalesce(max(${documentTypeVersions.version}), 0)` })
        .from(documentTypeVersions)
        .where(eq(documentTypeVersions.typeId, typeId));
      const next = (maxRows[0]?.max ?? 0) + 1;
      const inserted = await tx
        .insert(documentTypeVersions)
        .values({ typeId, version: next, definition })
        .returning();
      return toVersionDto(this.firstOrThrow(inserted));
    });
  }

  /** Edit a draft version's definition (drafts only → 409). */
  async editDraft(
    typeId: string,
    versionId: string,
    definition: Record<string, unknown>,
  ): Promise<DocumentTypeVersionResponse> {
    const { type, version } = await this.requireVersion(typeId, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be edited');
    }
    validateDefinition(type.kind, definition);
    const updated = await this.db
      .update(documentTypeVersions)
      .set({ definition })
      .where(eq(documentTypeVersions.id, versionId))
      .returning();
    return toVersionDto(this.firstOrThrow(updated));
  }

  /** Delete a draft version (drafts only → 409). */
  async deleteDraft(typeId: string, versionId: string): Promise<void> {
    const { version } = await this.requireVersion(typeId, versionId);
    if (version.status !== 'draft') {
      throw new ConflictException('Only draft versions can be deleted');
    }
    await this.db.delete(documentTypeVersions).where(eq(documentTypeVersions.id, versionId));
  }

  /** Publish a draft — archive the currently-published version first (≤1 published per type). */
  async publish(typeId: string, versionId: string): Promise<DocumentTypeVersionResponse> {
    await this.requireType(typeId);
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(documentTypeVersions)
        .where(and(eq(documentTypeVersions.id, versionId), eq(documentTypeVersions.typeId, typeId)))
        .limit(1);
      const version = rows[0];
      if (version === undefined) {
        throw new NotFoundException('Document type version not found');
      }
      if (version.status !== 'draft') {
        throw new ConflictException('Only draft versions can be published');
      }
      await tx
        .update(documentTypeVersions)
        .set({ archivedAt: sql`now()` })
        .where(
          and(
            eq(documentTypeVersions.typeId, typeId),
            eq(documentTypeVersions.status, 'published'),
          ),
        );
      const published = await tx
        .update(documentTypeVersions)
        .set({ publishedAt: sql`now()` })
        .where(eq(documentTypeVersions.id, versionId))
        .returning();
      return toVersionDto(this.firstOrThrow(published));
    });
  }

  /** Archive a version (any non-archived → archived). */
  async archive(typeId: string, versionId: string): Promise<DocumentTypeVersionResponse> {
    const { version } = await this.requireVersion(typeId, versionId);
    if (version.status === 'archived') {
      throw new ConflictException('Version is already archived');
    }
    const archived = await this.db
      .update(documentTypeVersions)
      .set({ archivedAt: sql`now()` })
      .where(eq(documentTypeVersions.id, versionId))
      .returning();
    return toVersionDto(this.firstOrThrow(archived));
  }

  private firstOrThrow<T>(rows: T[]): T {
    const row = rows[0];
    if (row === undefined) {
      throw new Error('document type version mutation returned no row');
    }
    return row;
  }

  private async requireType(id: string): Promise<DocumentType> {
    const rows = await this.db
      .select()
      .from(documentTypes)
      .where(eq(documentTypes.id, id))
      .limit(1);
    const type = rows[0];
    if (type === undefined) {
      throw new NotFoundException('Document type not found');
    }
    return type;
  }

  private async requireVersion(typeId: string, versionId: string) {
    const type = await this.requireType(typeId);
    const rows = await this.db
      .select()
      .from(documentTypeVersions)
      .where(and(eq(documentTypeVersions.id, versionId), eq(documentTypeVersions.typeId, typeId)))
      .limit(1);
    const version = rows[0];
    if (version === undefined) {
      throw new NotFoundException('Document type version not found');
    }
    return { type, version };
  }
}
