import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Feature 217. A TEMPLATE is a `documents` row with `kind = 'template'` — the shape other documents
 * of the same `type` follow. The old `document_types` / `document_type_versions` pair is gone, so a
 * template version is an ordinary `document_versions` row and its `definition` is now `content`.
 */

export const documentTypeSchema = z.enum(['service', 'application-method', 'service-agreement']);
export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;

/** A JSON Schema object (basic top-level shape; extra keys preserved). */
export const jsonSchemaSchema = z
  .object({ type: z.string(), properties: z.record(z.string(), z.unknown()) })
  .catchall(z.unknown());

/** A JSONForms UI schema (basic top-level shape; extra keys preserved). */
export const uiSchemaSchema = z
  .object({ type: z.string(), elements: z.array(z.unknown()) })
  .catchall(z.unknown());

/** The two halves `@repo/forms` opens and hands back (`StudioDocument`). */
export const studioDocumentSchema = z.object({
  schema: jsonSchemaSchema,
  uischema: uiSchemaSchema,
});
export type StudioDocumentInput = z.infer<typeof studioDocumentSchema>;

/**
 * Which `uischema` root a document of each type may have. These are `@repo/forms` root-only
 * boundaries: `Service` (doc 215) for a service, `Form` (doc 192) or `Flow` for a way to apply.
 * This is the one place the API knows about element types — everything below it is opaque JSON.
 */
const ROOTS_BY_TYPE: Record<DocumentTypeValue, readonly string[]> = {
  service: ['Service'],
  'application-method': ['Form', 'Flow'],
  'service-agreement': ['Form'],
};

/** The allowed `uischema.type` values for a document type. */
export function allowedRootsFor(type: DocumentTypeValue): readonly string[] {
  return ROOTS_BY_TYPE[type];
}

/** Add or edit a version — `content` is validated against the document's type in the service. */
export const versionContentSchema = z.object({ content: studioDocumentSchema });
export class VersionContentDto extends createZodDto(versionContentSchema) {}
export type VersionContentInput = z.infer<typeof versionContentSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const templateSchema = z.object({
  id: z.string(),
  workspaceId: z.string().nullable(),
  type: documentTypeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class TemplateDto extends createZodDto(templateSchema) {}
export type TemplateResponse = z.infer<typeof templateSchema>;

export const templateVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  versionNumber: z.number().int(),
  revision: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  /** GENERATED from `content`; NULL when the root carries no label. */
  title: z.string().nullable(),
  /** GENERATED from `content`; NULL for a rich (Lexical) description — see doc 217. */
  description: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export class TemplateVersionDto extends createZodDto(templateVersionSchema) {}
export type TemplateVersionResponse = z.infer<typeof templateVersionSchema>;

/** Admin: a template with all its versions (incl. drafts). */
export const templateWithVersionsSchema = z.object({
  template: templateSchema,
  versions: z.array(templateVersionSchema),
});
export class TemplateWithVersionsDto extends createZodDto(templateWithVersionsSchema) {}
export type TemplateWithVersions = z.infer<typeof templateWithVersionsSchema>;

export class AdminTemplateListDto extends createZodDto(
  z.object({ items: z.array(templateWithVersionsSchema) }),
) {}

/** Staff: a template with its current published version + non-draft history. */
export const templateDetailSchema = z.object({
  template: templateSchema,
  published: templateVersionSchema.nullable(),
  history: z.array(templateVersionSchema),
});
export class TemplateDetailDto extends createZodDto(templateDetailSchema) {}
export type TemplateDetail = z.infer<typeof templateDetailSchema>;

/** Staff: catalog entry — a template and its current published version. */
export const templatePublishedSchema = z.object({
  template: templateSchema,
  published: templateVersionSchema,
});
export class StaffTemplateListDto extends createZodDto(
  z.object({ items: z.array(templatePublishedSchema) }),
) {}
export type TemplatePublished = z.infer<typeof templatePublishedSchema>;

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

export function toTemplateDto(row: Document): TemplateResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toTemplateVersionDto(row: DocumentVersion): TemplateVersionResponse {
  return {
    id: row.id,
    documentId: row.documentId,
    versionNumber: row.versionNumber,
    revision: row.revision,
    status: row.status,
    title: row.title,
    description: row.description,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}
