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

/** A catalog service card — no workspace fields. Title/description come from the published version. */
export const catalogServiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});
export type CatalogService = z.infer<typeof catalogServiceSchema>;
export class CatalogServiceDto extends createZodDto(catalogServiceSchema) {}
export class CatalogServiceListDto extends createZodDto(
  z.object({ items: z.array(catalogServiceSchema) }),
) {}

/**
 * An application method = a form the published service version references (relation
 * `application_form`). `label` is the call-to-action text; `title` is the form's name. Workspace-free.
 */
export const applicationFormSchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  title: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  kind: z.string(),
});
export type ApplicationForm = z.infer<typeof applicationFormSchema>;

/**
 * A service detail = the card fields + a pointer to its current published version (so the detail
 * page can render the version content and link to the version permalink) + the application-method
 * forms the service offers. Workspace-free.
 */
export const catalogServiceDetailSchema = catalogServiceSchema.extend({
  publishedVersionId: z.string(),
  version: z.number().int(),
  publishedAt: z.string().nullable(),
  /** The filled service content. */
  data: z.record(z.string(), z.unknown()),
  /** The JSON Schema + UISchema (from the bound Service type version) for rendering `data`. */
  schema: z.record(z.string(), z.unknown()),
  uischema: z.record(z.string(), z.unknown()),
  /** The forms a citizen can apply through (the published version's `application_form` references). */
  applications: z.array(applicationFormSchema),
});
export type CatalogServiceDetail = z.infer<typeof catalogServiceDetailSchema>;
export class CatalogServiceDetailDto extends createZodDto(catalogServiceDetailSchema) {}

/**
 * A historical service version a citizen may read directly — only `published` or `archived`
 * versions are exposed (drafts are staff-internal). Backs "view the service as it was" from an
 * application. `data` is the version's filled service content (JSONB).
 */
export const catalogServiceVersionSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  version: z.number().int(),
  status: z.enum(['published', 'archived']),
  title: z.string(),
  data: z.record(z.string(), z.unknown()),
  /** The JSON Schema + UISchema (from the bound Service type version) for rendering `data`. */
  schema: z.record(z.string(), z.unknown()),
  uischema: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export type CatalogServiceVersion = z.infer<typeof catalogServiceVersionSchema>;
export class CatalogServiceVersionDto extends createZodDto(catalogServiceVersionSchema) {}
