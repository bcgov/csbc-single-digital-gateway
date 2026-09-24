import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { studioDocumentSchema } from '../../templates/dtos/template.dtos';

/**
 * Feature 217. A service agreement is a `documents` row with `type = 'service-agreement'` whose
 * version payload is one `content` (a `@repo/forms` StudioDocument), and whose `title` /
 * `description` are GENERATED from that content. The old `data`-filled-against-a-type model is
 * gone, and with `document_references` the "services this agreement is attached to" list went too.
 */

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/**
 * Create an agreement. `workspaceId` present → a workspace-scoped (staff) agreement; absent →
 * a global (admin) agreement. `title` is stamped into the copied template's `uischema.label`,
 * which is what the GENERATED title column reads.
 */
export const createServiceAgreementSchema = z.object({
  workspaceId: z.uuid().optional(),
  title: z.string().trim().min(1).max(255),
});
export class CreateServiceAgreementDto extends createZodDto(createServiceAgreementSchema) {}
export type CreateServiceAgreementInput = z.infer<typeof createServiceAgreementSchema>;

/** Edit a draft version's content. */
export const updateServiceAgreementSchema = z.object({ content: studioDocumentSchema });
export class UpdateServiceAgreementDto extends createZodDto(updateServiceAgreementSchema) {}
export type UpdateServiceAgreementInput = z.infer<typeof updateServiceAgreementSchema>;

/** List filter: a workspace (staff, returns that workspace + global) or none (admin, global only). */
export const listServiceAgreementsSchema = z.object({ workspaceId: z.uuid().optional() });
export class ListServiceAgreementsDto extends createZodDto(listServiceAgreementsSchema) {}
export type ListServiceAgreementsQuery = z.infer<typeof listServiceAgreementsSchema>;

/**
 * Paginated, sortable, searchable agreements list (initiative `staff-list-query`). Workspace scope
 * (`workspaceId` present) lists the workspace's OWN agreements only — globals are excluded from the
 * workspace list (feature 150); admin scope (no `workspaceId`) lists globals. `sort: 'status'` orders
 * by the derived status precedence (published → draft → archived → none).
 */
export const listServiceAgreementsPageSchema = z.object({
  workspaceId: z.uuid().optional(),
  q: z.string().trim().max(255).optional(),
  sort: z.enum(['title', 'updated', 'status']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export class ListServiceAgreementsPageDto extends createZodDto(listServiceAgreementsPageSchema) {}
export type ListServiceAgreementsPageQuery = z.infer<typeof listServiceAgreementsPageSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const serviceAgreementSchema = z.object({
  id: z.string(),
  // Nullable: a global (admin-authored) agreement has no workspace.
  workspaceId: z.string().nullable(),
  /** From the current version's GENERATED title — NULL when its content carries no root label. */
  title: z.string().nullable(),
  type: z.literal('service-agreement'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ServiceAgreementDto extends createZodDto(serviceAgreementSchema) {}
export type ServiceAgreementResponse = z.infer<typeof serviceAgreementSchema>;

export const serviceAgreementVersionSchema = z.object({
  id: z.string(),
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
export class ServiceAgreementVersionDto extends createZodDto(serviceAgreementVersionSchema) {}
export type ServiceAgreementVersionResponse = z.infer<typeof serviceAgreementVersionSchema>;

/** Create/add-version response: the agreement document + the affected version. */
export const serviceAgreementWithVersionSchema = z.object({
  agreement: serviceAgreementSchema,
  version: serviceAgreementVersionSchema,
});
export class ServiceAgreementWithVersionDto extends createZodDto(
  serviceAgreementWithVersionSchema,
) {}
export type ServiceAgreementWithVersion = z.infer<typeof serviceAgreementWithVersionSchema>;

export const agreementDefinitionSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
  uischema: z.record(z.string(), z.unknown()),
});

/** Detail: the agreement + all its versions + the template to render.
 *
 * Feature 217 dropped `services` (which services this agreement is attached to): it was derived
 * from `document_references`, and linking documents is a later feature. */
export const serviceAgreementDetailSchema = z.object({
  agreement: serviceAgreementSchema,
  versions: z.array(serviceAgreementVersionSchema),
  definition: agreementDefinitionSchema,
});
export class ServiceAgreementDetailDto extends createZodDto(serviceAgreementDetailSchema) {}
export type ServiceAgreementDetail = z.infer<typeof serviceAgreementDetailSchema>;

/** List entry: an agreement + a representative status and whether it is global. */
export const serviceAgreementSummarySchema = serviceAgreementSchema.extend({
  status: z.enum(['draft', 'published', 'archived', 'none']),
  isGlobal: z.boolean(),
});
export class ServiceAgreementListDto extends createZodDto(
  z.object({ items: z.array(serviceAgreementSummarySchema) }),
) {}
export type ServiceAgreementSummary = z.infer<typeof serviceAgreementSummarySchema>;

/** Paginated agreements list envelope (initiative `staff-list-query`). */
export const serviceAgreementListPageSchema = z.object({
  items: z.array(serviceAgreementSummarySchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type ServiceAgreementListPageResponse = z.infer<typeof serviceAgreementListPageSchema>;
export class ServiceAgreementListPageDto extends createZodDto(serviceAgreementListPageSchema) {}

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

/**
 * `title` now lives on the VERSION (generated from its content), so the caller passes the current
 * version rather than reading a column off the document row.
 */
export function toAgreementDto(
  row: Document,
  current?: Pick<DocumentVersion, 'title'>,
): ServiceAgreementResponse {
  if (row.type !== 'service-agreement') {
    throw new Error(`document ${row.id} is a ${row.type}, not a service agreement`);
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: current?.title ?? null,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAgreementVersionDto(row: DocumentVersion): ServiceAgreementVersionResponse {
  return {
    id: row.id,
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
