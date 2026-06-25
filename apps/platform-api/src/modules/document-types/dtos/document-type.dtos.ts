import type { DocumentType, DocumentTypeVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { basicFormDefinitionSchema, multiStageDefinitionSchema } from './definition.schemas';

export const documentKindSchema = z.enum(['basic-form', 'multi-stage-form']);
export type DocumentKind = z.infer<typeof documentKindSchema>;

/** The `definition` schema for a given kind (used to validate add/edit-version payloads). */
export function definitionForKind(kind: DocumentKind) {
  return kind === 'basic-form' ? basicFormDefinitionSchema : multiStageDefinitionSchema;
}

const name = z.string().trim().min(1).max(255);

/**
 * Create a document type. The `definition` is strictly validated against the per-kind schema
 * (`basicFormDefinitionSchema` / `multiStageDefinitionSchema`) via `superRefine` — a discriminated
 * union can't be a `createZodDto` class base (its type is `A | B`), but the runtime validation is
 * identical: a definition that doesn't match its kind 400s with the real error.
 */
export const createDocumentTypeSchema = z
  .object({
    name,
    kind: documentKindSchema,
    definition: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, ctx) => {
    const result = definitionForKind(value.kind).safeParse(value.definition);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['definition'],
        message: z.prettifyError(result.error),
      });
    }
  });
export class CreateDocumentTypeDto extends createZodDto(createDocumentTypeSchema) {}
export type CreateDocumentTypeInput = z.infer<typeof createDocumentTypeSchema>;

/** Add or edit a version — the `definition` is validated against the type's kind in the service. */
export const versionDefinitionSchema = z.object({ definition: z.record(z.string(), z.unknown()) });
export class VersionDefinitionDto extends createZodDto(versionDefinitionSchema) {}
export type VersionDefinitionInput = z.infer<typeof versionDefinitionSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const documentTypeSchema = z.object({
  id: z.string(),
  workspaceId: z.string().nullable(),
  name: z.string(),
  kind: z.string(),
  createdAt: z.string(),
});
export class DocumentTypeDto extends createZodDto(documentTypeSchema) {}
export type DocumentTypeResponse = z.infer<typeof documentTypeSchema>;

export const documentTypeVersionSchema = z.object({
  id: z.string(),
  typeId: z.string(),
  version: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  definition: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export class DocumentTypeVersionDto extends createZodDto(documentTypeVersionSchema) {}
export type DocumentTypeVersionResponse = z.infer<typeof documentTypeVersionSchema>;

/** Admin: a type with all its versions (incl. drafts). */
export const documentTypeWithVersionsSchema = z.object({
  type: documentTypeSchema,
  versions: z.array(documentTypeVersionSchema),
});
export class DocumentTypeWithVersionsDto extends createZodDto(documentTypeWithVersionsSchema) {}
export type DocumentTypeWithVersions = z.infer<typeof documentTypeWithVersionsSchema>;

export class AdminDocumentTypeListDto extends createZodDto(
  z.object({ items: z.array(documentTypeWithVersionsSchema) }),
) {}

/** Staff: a type with its current published version + non-draft history. */
export const documentTypeDetailSchema = z.object({
  type: documentTypeSchema,
  published: documentTypeVersionSchema.nullable(),
  history: z.array(documentTypeVersionSchema),
});
export class DocumentTypeDetailDto extends createZodDto(documentTypeDetailSchema) {}
export type DocumentTypeDetail = z.infer<typeof documentTypeDetailSchema>;

/** Staff: catalog entry — a type and its current published version. */
export const documentTypePublishedSchema = z.object({
  type: documentTypeSchema,
  published: documentTypeVersionSchema,
});
export class StaffDocumentTypeListDto extends createZodDto(
  z.object({ items: z.array(documentTypePublishedSchema) }),
) {}
export type DocumentTypePublished = z.infer<typeof documentTypePublishedSchema>;

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

export function toTypeDto(row: DocumentType): DocumentTypeResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toVersionDto(row: DocumentTypeVersion): DocumentTypeVersionResponse {
  return {
    id: row.id,
    typeId: row.typeId,
    version: row.version,
    status: row.status,
    definition: row.definition,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}
