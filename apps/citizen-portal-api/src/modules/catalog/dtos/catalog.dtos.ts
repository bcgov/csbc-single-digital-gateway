import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs for the citizen-facing service catalog (feature 60). Everything here is workspace-free:
 * the citizen portal never surfaces the workspace a service lives in. Request DTOs are validated
 * by the global ZodValidationPipe; response DTOs serialize handler output via @ZodSerializerDto.
 */

// ── Requests ────────────────────────────────────────────────────────────────────────────────────

/** `GET /v1/services` — optional free-text search + a bounded result limit. */
export const listServicesQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

// ── Responses ───────────────────────────────────────────────────────────────────────────────────

/**
 * A catalog service card — no workspace fields. Title/description are GENERATED from the published
 * version's content (feature 217), and are NULL when it carries no root label, or when the
 * description is authored as rich content rather than plain text.
 */
export const catalogServiceSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
});
export type CatalogService = z.infer<typeof catalogServiceSchema>;
export class CatalogServiceDto extends createZodDto(catalogServiceSchema) {}
export class CatalogServiceListDto extends createZodDto(
  z.object({ items: z.array(catalogServiceSchema) }),
) {}

/**
 * A service detail = the card fields + a pointer to its current published version (so the detail
 * page can render the version content and link to the version permalink). Workspace-free.
 *
 * Feature 217 dropped `applications` (the ways to apply): they came from `document_references`; doc 291 brings them back
 * as `applicationMethods`, read from the published version's document-reference answers.
 */
/** Doc 291 rule 5: an application method a citizen may open, as its published version names it. */
export const catalogApplicationMethodSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
});

export const catalogServiceDetailSchema = catalogServiceSchema.extend({
  publishedVersionId: z.string(),
  versionNumber: z.number().int(),
  publishedAt: z.string().nullable(),
  /** The authored document to render: its own content, not a type template + filled values. */
  schema: z.record(z.string(), z.unknown()),
  /** Doc 275: the uischemas by variant name; `default` is always present. */
  variants: z.record(z.string(), z.record(z.string(), z.unknown())),
  /** Doc 281: the service's answers (`content.data`); `{}` when none. */
  data: z.record(z.string(), z.unknown()),
  /** Doc 291 rules 4-6: the published application methods, in reference order. */
  applicationMethods: z.array(catalogApplicationMethodSchema),
});
export type CatalogServiceDetail = z.infer<typeof catalogServiceDetailSchema>;
export class CatalogServiceDetailDto extends createZodDto(catalogServiceDetailSchema) {}

/**
 * A historical service version a citizen may read directly — only `published` or `archived`
 * versions are exposed (drafts are staff-internal). Backs "view the service as it was" from an
 * application.
 */
export const catalogServiceVersionSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  versionNumber: z.number().int(),
  status: z.enum(['published', 'archived']),
  title: z.string().nullable(),
  /** The authored document to render: its own content (feature 217). */
  schema: z.record(z.string(), z.unknown()),
  /** Doc 275: the uischemas by variant name; `default` is always present. */
  variants: z.record(z.string(), z.record(z.string(), z.unknown())),
  /** Doc 281: the service's answers (`content.data`); `{}` when none. */
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export type CatalogServiceVersion = z.infer<typeof catalogServiceVersionSchema>;
export class CatalogServiceVersionDto extends createZodDto(catalogServiceVersionSchema) {}

/** Doc 291 rule 7: one application method's PUBLISHED form — what the apply page fills. No answers. */
export const catalogApplicationMethodDetailSchema = catalogApplicationMethodSchema.extend({
  /** Doc 292: the published version a citizen's draft is created on. */
  versionId: z.string(),
  schema: z.record(z.string(), z.unknown()),
  variants: z.record(z.string(), z.record(z.string(), z.unknown())),
});
export type CatalogApplicationMethodDetail = z.infer<typeof catalogApplicationMethodDetailSchema>;
export class CatalogApplicationMethodDetailDto extends createZodDto(
  catalogApplicationMethodDetailSchema,
) {}
