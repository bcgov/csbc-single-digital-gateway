import { DOCUMENT_TYPE, type Document, type DocumentVersion, documentType } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Feature 217. A TEMPLATE is a `documents` row with `kind = 'template'` — the shape other documents
 * of the same `type` follow. The old `document_types` / `document_type_versions` pair is gone, so a
 * template version is an ordinary `document_versions` row and its `definition` is now `content`.
 */

/** Built from the DB enum (doc 226) — the ONE list of type values, never restated here. */
export const documentTypeSchema = z.enum(documentType.enumValues);
export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;

/** A JSON Schema object (basic top-level shape; extra keys preserved). */
export const jsonSchemaSchema = z
  .object({ type: z.string(), properties: z.record(z.string(), z.unknown()) })
  .catchall(z.unknown());

/** A JSONForms UI schema (basic top-level shape; extra keys preserved). */
export const uiSchemaSchema = z
  .object({ type: z.string(), elements: z.array(z.unknown()) })
  .catchall(z.unknown());

/**
 * Doc 220 — what a consuming document's owner may do to one element, and to its contents.
 *
 * `strictObject`, deliberately: an unknown verb key is a MISTAKE, not forward compatibility. Feature
 * 222 enforces against this map server-side, so a key nothing reads would look like a granted or
 * denied permission to an author and mean nothing at all to the enforcer.
 */
const capabilitySchema = z.strictObject({
  edit: z.union([z.literal('all'), z.literal('none'), z.array(z.string())]).optional(),
  remove: z.boolean().optional(),
  move: z.boolean().optional(),
  addChildren: z.boolean().optional(),
  removeChildren: z.boolean().optional(),
  reorderChildren: z.boolean().optional(),
  edges: z.boolean().optional(),
  // Doc 231: how far the author's contents-toggle changes cascade — an authoring hint that
  // enforcement never reads, but the object is STRICT, so it must be listed or every save refuses it.
  cascade: z.enum(['descendants', 'children', 'self']).optional(),
});

/** `default` is keyed by element TYPE plus the `'*'` baseline; `elements` by an authored element id. */
export const capabilityMapSchema = z.strictObject({
  default: z.record(z.string(), capabilitySchema).optional(),
  elements: z.record(z.string(), capabilitySchema).optional(),
});

/**
 * A version's content (doc 275): a `@repo/documents` `DocumentContent` — ONE schema and the uischemas that present it,
 * `variants`, keyed by name; `default` is mandatory and is the one shown unless another is asked for. Top-level
 * `uischema` is gone: `z.object` STRIPS unknown keys, so an old `{ schema, uischema }` body fails here (no `variants`)
 * rather than saving half a document.
 *
 * `capabilities` is OPTIONAL and present only on a TEMPLATE. It MUST be listed here: `z.object` STRIPS unknown keys,
 * so before doc 220 a capability map reaching this schema was silently deleted on every save. It is VALIDATED rather
 * than passed through because feature 222 enforces against it: a malformed map is a governance hole.
 */
export const documentContentSchema = z.object({
  schema: jsonSchemaSchema,
  variants: z
    .record(z.string(), uiSchemaSchema)
    .refine((variants) => Object.hasOwn(variants, 'default'), {
      message: 'variants must include "default"',
    }),
  capabilities: capabilityMapSchema.optional(),
});
export type DocumentContentInput = z.infer<typeof documentContentSchema>;

/**
 * Which root a document of each type may have, in EVERY variant (doc 275). These are `@repo/documents` root-only
 * boundaries: a `Form`, or a `Funnel` of Forms — for every type. Kept per type so a type can narrow later. This is the
 * one place the API knows about element types — everything below it is opaque JSON.
 */
const FORM_OR_FUNNEL: readonly string[] = Object.freeze(['Form', 'Funnel']);
const ROOTS_BY_TYPE: Readonly<Record<DocumentTypeValue, readonly string[]>> = Object.freeze({
  [DOCUMENT_TYPE.service]: FORM_OR_FUNNEL,
  [DOCUMENT_TYPE.applicationMethod]: FORM_OR_FUNNEL,
  [DOCUMENT_TYPE.serviceAgreement]: FORM_OR_FUNNEL,
});

/** The allowed root `type` values for a document type. */
export function allowedRootsFor(type: DocumentTypeValue): readonly string[] {
  return ROOTS_BY_TYPE[type];
}

/** Add or edit a version — `content` is validated against the document's type in the service. */
export const versionContentSchema = z.object({ content: documentContentSchema });
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

/** Doc 287: narrow the staff catalog to one document type. Omitted = every type (unchanged). */
export const staffTemplatesQuerySchema = z.object({ type: documentTypeSchema.optional() });
export class StaffTemplatesQueryDto extends createZodDto(staffTemplatesQuerySchema) {}
export type StaffTemplatesQuery = z.infer<typeof staffTemplatesQuerySchema>;

/** Doc 227: an admin creates a GLOBAL template — a draft v1 of the type's blank content. */
export const createTemplateSchema = z.object({
  type: documentTypeSchema,
  /** Stamped into the blank content's `uischema.label`, which the GENERATED title reads. */
  title: z.string().trim().min(1).max(200),
});
export class CreateTemplateDto extends createZodDto(createTemplateSchema) {}
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/**
 * Doc 227 (the doc 225 contract): what may be deleted, and why not. The API is the authority — the
 * console cannot see which documents reference a template — so it renders from this alone.
 */
export const templateDeletableSchema = z.object({
  /** Whether the whole template may go. */
  template: z.boolean(),
  /** Why it may not, ready to show. Absent exactly when `template` is true. */
  reason: z.string().optional(),
  /** The versions that may be deleted on their own — empty when there is only one. */
  versionIds: z.array(z.string()),
});
export type TemplateDeletable = z.infer<typeof templateDeletableSchema>;

/** Admin detail: a template, its versions, and what may be deleted. */
export const adminTemplateDetailSchema = templateWithVersionsSchema.extend({
  deletable: templateDeletableSchema,
});
export class AdminTemplateDetailDto extends createZodDto(adminTemplateDetailSchema) {}
export type AdminTemplateDetail = z.infer<typeof adminTemplateDetailSchema>;

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
