import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  type DocumentType,
  documentTypes,
  documentTypeVersions,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, asc, desc, eq } from 'drizzle-orm';
import {
  type CreateDocumentTypeInput,
  type DocumentTypeDetail,
  type DocumentTypePublished,
  type DocumentTypeVersionResponse,
  type DocumentTypeWithVersions,
  toTypeDto,
  toVersionDto,
} from '../dtos/document-type.dtos';

@Injectable()
export class DocumentTypesService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  /** Create a document type + its draft version 1 (atomic). */
  async create(input: CreateDocumentTypeInput): Promise<DocumentTypeWithVersions> {
    return this.db.transaction(async (tx) => {
      const insertedType = await tx
        .insert(documentTypes)
        .values({ name: input.name, kind: input.kind })
        .returning();
      const type = insertedType[0];
      if (type === undefined) {
        throw new Error('document type insert returned no row');
      }
      const insertedVersion = await tx
        .insert(documentTypeVersions)
        .values({ typeId: type.id, version: 1, definition: input.definition })
        .returning();
      const version = insertedVersion[0];
      if (version === undefined) {
        throw new Error('document type version insert returned no row');
      }
      return { type: toTypeDto(type), versions: [toVersionDto(version)] };
    });
  }

  /** Admin: every type, each with all its versions (incl. drafts). */
  async adminList(): Promise<DocumentTypeWithVersions[]> {
    const types = await this.db.select().from(documentTypes).orderBy(desc(documentTypes.createdAt));
    return Promise.all(
      types.map(async (type) => ({
        type: toTypeDto(type),
        versions: (await this.versionsOf(type.id)).map(toVersionDto),
      })),
    );
  }

  /** Admin: one type + all versions; 404 if missing. */
  async adminGet(id: string): Promise<DocumentTypeWithVersions> {
    const type = await this.requireType(id);
    const versions = await this.versionsOf(id);
    return { type: toTypeDto(type), versions: versions.map(toVersionDto) };
  }

  /** Staff: types that have a current published version, returning that version. */
  async staffList(): Promise<DocumentTypePublished[]> {
    const rows = await this.db
      .select({ type: documentTypes, version: documentTypeVersions })
      .from(documentTypeVersions)
      .innerJoin(documentTypes, eq(documentTypes.id, documentTypeVersions.typeId))
      .where(eq(documentTypeVersions.status, 'published'))
      .orderBy(asc(documentTypes.name));
    return rows.map((row) => ({ type: toTypeDto(row.type), published: toVersionDto(row.version) }));
  }

  /** Staff: a type + its current published version + the non-draft (published/archived) history. */
  async staffGet(id: string): Promise<DocumentTypeDetail> {
    const type = await this.requireType(id);
    const versions = await this.versionsOf(id);
    const published = versions.find((version) => version.status === 'published');
    const history = versions.filter((version) => version.status !== 'draft');
    return {
      type: toTypeDto(type),
      published: published ? toVersionDto(published) : null,
      history: history.map(toVersionDto),
    };
  }

  /** Staff: a published or archived version's full definition; 404 for drafts/unknown. */
  async staffGetVersion(typeId: string, versionId: string): Promise<DocumentTypeVersionResponse> {
    const rows = await this.db
      .select()
      .from(documentTypeVersions)
      .where(and(eq(documentTypeVersions.id, versionId), eq(documentTypeVersions.typeId, typeId)))
      .limit(1);
    const version = rows[0];
    if (version === undefined || version.status === 'draft') {
      throw new NotFoundException('Document type version not found');
    }
    return toVersionDto(version);
  }

  private async versionsOf(typeId: string) {
    return this.db
      .select()
      .from(documentTypeVersions)
      .where(eq(documentTypeVersions.typeId, typeId))
      .orderBy(asc(documentTypeVersions.version));
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
}
