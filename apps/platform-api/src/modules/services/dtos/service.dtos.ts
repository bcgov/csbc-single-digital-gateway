import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { documentContentSchema } from '../../templates/dtos/template.dtos';

/**
 * Feature 217. A service is a `documents` row with `type = 'services.service'`, `kind = 'document'`, whose
 * version payload is one `content` (a `@repo/documents` DocumentContent, doc 275). The old split — a seeded
 * Service *type* carrying the template, and `data` carrying values filled against it — is gone: a
 * service is AUTHORED, the way a form is, and its `title` / `description` are GENERATED from
 * the default variant (`content.variants.default`).
 *
 * Also gone with `document_references`: `applications` / `applicationOrder` on create and update,
 * and the forms catalog. Linking a service to its ways to apply is a later feature.
 */

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/**
 * Create a service. `title` is stamped into the copied template's default variant `label`, which is what
 * the GENERATED `document_versions.title` column reads — there is no separate title column to
 * keep in sync.
 */
export const createServiceSchema = z.object({
  workspaceId: z.uuid(),
  title: z.string().trim().min(1).max(255),
  /** Doc 228: the template to build from. Omitted = the only published one of this type. */
  templateId: z.uuid().optional(),
});
export class CreateServiceDto extends createZodDto(createServiceSchema) {}
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

/** Doc 228: which template the create editor shows. Omitted = the only published one. */
export const serviceDefinitionQuerySchema = z.object({ templateId: z.uuid().optional() });
export class ServiceDefinitionQueryDto extends createZodDto(serviceDefinitionQuerySchema) {}

export const listServicesQuerySchema = z.object({ workspaceId: z.uuid() });
export class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

/**
 * Paginated, sortable, searchable services list query (initiative `staff-list-query`). `q` is an
 * ILIKE substring over the current version's GENERATED title/description; `sort: 'status'` orders
 * by the derived status precedence (published → draft → archived → none).
 */
export const listServicesPageQuerySchema = z.object({
  workspaceId: z.uuid(),
  q: z.string().trim().max(255).optional(),
  sort: z.enum(['title', 'updated', 'status']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export class ListServicesPageQueryDto extends createZodDto(listServicesPageQuerySchema) {}
export type ListServicesPageQuery = z.infer<typeof listServicesPageQuerySchema>;

/**
 * Doc 287: the services a document-reference control may pick — the caller's workspace's services in
 * every status, plus other workspaces' published services. `q` is an ILIKE over the chosen version's
 * title; `excludeId` drops the service being edited.
 */
export const referenceableServicesQuerySchema = z.object({
  workspaceId: z.uuid(),
  q: z.string().trim().max(200).optional(),
  excludeId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});
export class ReferenceableServicesQueryDto extends createZodDto(referenceableServicesQuerySchema) {}
export type ReferenceableServicesQuery = z.infer<typeof referenceableServicesQuerySchema>;

/** Save a draft version: the whole authored document. */
/**
 * Doc 230: a service version's content also carries the staff's ANSWERS to its form, `data`. Only here —
 * templates, agreements and forms keep the plain document. Absent `data` keeps the stored answers.
 */
export const serviceContentSchema = documentContentSchema.extend({
  data: z.record(z.string(), z.unknown()).optional(),
});
export const updateVersionContentSchema = z.object({ content: serviceContentSchema });
export class UpdateVersionContentDto extends createZodDto(updateVersionContentSchema) {}
export type UpdateVersionContentInput = z.infer<typeof updateVersionContentSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const serviceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  /** From the current version's GENERATED title — NULL when its content carries no root label. */
  title: z.string().nullable(),
  /** From the current version's GENERATED description — NULL for a rich description (doc 217). */
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ServiceResponse = z.infer<typeof serviceSchema>;

export const serviceVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  /** The template version this version conforms to — selects its render template (feature 174). */
  templateVersionId: z.string().nullable(),
  versionNumber: z.number().int(),
  revision: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  title: z.string().nullable(),
  description: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
});
export class ServiceVersionDto extends createZodDto(serviceVersionSchema) {}
export type ServiceVersionResponse = z.infer<typeof serviceVersionSchema>;

/** List entry: a service + a representative current status + its version count. */
export const serviceSummarySchema = serviceSchema.extend({
  status: z.enum(['draft', 'published', 'archived', 'none']),
  versionCount: z.number().int(),
  /** Whether the service document has submissions — gates delete (none) vs archive. */
  hasSubmissions: z.boolean(),
  /** Whether the latest version was ever published — un-archive reads "Publish" (true) vs "Restore". */
  latestPublished: z.boolean(),
});
export type ServiceSummary = z.infer<typeof serviceSummarySchema>;

/** Paginated services list envelope (initiative `staff-list-query`). */
export const serviceListResponseSchema = z.object({
  items: z.array(serviceSummarySchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type ServiceListResponse = z.infer<typeof serviceListResponseSchema>;
export class ServiceListDto extends createZodDto(serviceListResponseSchema) {}

/** Doc 287: one pickable service — workspace internals beyond `id` and `name` are never exposed. */
export const referenceableServiceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'none']),
});
export type ReferenceableService = z.infer<typeof referenceableServiceSchema>;

export const referenceableServiceListSchema = z.object({
  items: z.array(referenceableServiceSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type ReferenceableServiceList = z.infer<typeof referenceableServiceListSchema>;
export class ReferenceableServiceListDto extends createZodDto(referenceableServiceListSchema) {}

/** Create response: the service + its versions. */
export const serviceWithVersionsSchema = z.object({
  service: serviceSchema,
  versions: z.array(serviceVersionSchema),
});
export class ServiceWithVersionsDto extends createZodDto(serviceWithVersionsSchema) {}
export type ServiceWithVersions = z.infer<typeof serviceWithVersionsSchema>;

/**
 * The content a renderer needs, as authored on ONE template version.
 *
 * Doc 220/221: `capabilities` says what a consuming document's owner may do. ABSENT means the
 * template governs nothing, which is deliberately different from an empty map.
 */
export const definitionSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
  variants: z.record(z.string(), z.record(z.string(), z.unknown())),
  capabilities: z.record(z.string(), z.unknown()).optional(),
});
export class DefinitionDto extends createZodDto(definitionSchema) {}
export type DefinitionResponse = z.infer<typeof definitionSchema>;

/**
 * Doc 230: what may be deleted from the edit page, and why not — the API decides (doc 225), since the
 * console cannot see submissions.
 */
export const serviceDeletableSchema = z.object({
  /** Whether the whole service may go. */
  service: z.boolean(),
  /** Why it may not, ready to show. Absent exactly when `service` is true. */
  reason: z.string().optional(),
  /** Versions deletable on their own: drafts, and never the only version. */
  versionIds: z.array(z.string()),
});
export type ServiceDeletable = z.infer<typeof serviceDeletableSchema>;

export const serviceDetailSchema = z.object({
  service: serviceSchema,
  versions: z.array(serviceVersionSchema),
  /**
   * The template for the CURRENT version (latest published, else latest) — kept for the editor and
   * every existing consumer.
   */
  definition: definitionSchema,
  /**
   * Every template the service's versions span, keyed by `templateVersionId` (feature 174). A
   * version authored before a template reshape must render against its OWN template, so read
   * surfaces look up `definitions[version.templateVersionId]` rather than using `definition` for
   * all versions. Usually a single entry.
   */
  definitions: z.record(z.string(), definitionSchema),
  /** Whether the service has submissions — gates delete vs archive. */
  hasSubmissions: z.boolean(),
  /** Doc 230: what may be deleted, and why not. */
  deletable: serviceDeletableSchema,
});
export class ServiceDetailDto extends createZodDto(serviceDetailSchema) {}
export type ServiceDetail = z.infer<typeof serviceDetailSchema>;

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

/**
 * `title` / `description` now live on the VERSION (generated from its content), so the caller
 * passes the current version's values rather than reading them off the document row.
 */
export function toServiceDto(
  row: Document,
  current?: Pick<DocumentVersion, 'title' | 'description'>,
): ServiceResponse {
  if (row.workspaceId === null) {
    // A service is always workspace-scoped (only service agreements may be global); a
    // workspace-less service document is a data invariant violation, not a valid response.
    throw new Error('service document has no workspace');
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: current?.title ?? null,
    description: current?.description ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toServiceVersionDto(row: DocumentVersion): ServiceVersionResponse {
  return {
    id: row.id,
    documentId: row.documentId,
    templateVersionId: row.templateVersionId,
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
