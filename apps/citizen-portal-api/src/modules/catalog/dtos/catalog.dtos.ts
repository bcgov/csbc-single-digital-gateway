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

/** A catalog service card — no workspace fields. */
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
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export type CatalogServiceVersion = z.infer<typeof catalogServiceVersionSchema>;
export class CatalogServiceVersionDto extends createZodDto(catalogServiceVersionSchema) {}

/** The submission-workflow states, mirrored from `submission_versions.status`. */
export const applicationStatusSchema = z.enum([
  'draft',
  'pending',
  'in_review',
  'approved',
  'rejected',
  'needs_changes',
  'withdrawn',
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

/**
 * One of the signed-in citizen's applications. `serviceVersionId` points at the exact service
 * version applied to (published or archived), so the UI can deep-link to the historical detail.
 * Workspace-free.
 */
export const myApplicationSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceVersionId: z.string(),
  serviceTitle: z.string(),
  reference: z.string(),
  status: applicationStatusSchema,
  statusLabel: z.string(),
  lastUpdated: z.string(),
});
export type MyApplication = z.infer<typeof myApplicationSchema>;
export class MyApplicationListDto extends createZodDto(
  z.object({ items: z.array(myApplicationSchema) }),
) {}
