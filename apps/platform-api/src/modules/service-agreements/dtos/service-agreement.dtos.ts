import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/**
 * Create an agreement. `workspaceId` present → a workspace-scoped (staff) agreement; absent →
 * a global (admin) agreement. `data` holds the authored fields (validated for shape only here;
 * the full JSON-Schema validation runs on publish).
 */
export const createServiceAgreementSchema = z.object({
  workspaceId: z.uuid().optional(),
  data: z.record(z.string(), z.unknown()),
});
export class CreateServiceAgreementDto extends createZodDto(createServiceAgreementSchema) {}
export type CreateServiceAgreementInput = z.infer<typeof createServiceAgreementSchema>;

/** Edit a draft version's authored data (and optionally retitle the document). */
export const updateServiceAgreementSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  title: z.string().trim().min(1).max(255).optional(),
});
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
  title: z.string(),
  kind: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export class ServiceAgreementDto extends createZodDto(serviceAgreementSchema) {}
export type ServiceAgreementResponse = z.infer<typeof serviceAgreementSchema>;

export const serviceAgreementVersionSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  data: z.record(z.string(), z.unknown()),
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

/** A service this agreement is attached to (agreements may be attached to many services). */
export const associatedServiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  workspaceSlug: z.string(),
});
export type AssociatedService = z.infer<typeof associatedServiceSchema>;

/** Detail: the agreement + all its versions + the type definition + the services it's attached to. */
export const serviceAgreementDetailSchema = z.object({
  agreement: serviceAgreementSchema,
  versions: z.array(serviceAgreementVersionSchema),
  definition: agreementDefinitionSchema,
  services: z.array(associatedServiceSchema),
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

export function toAgreementDto(row: Document): ServiceAgreementResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAgreementVersionDto(row: DocumentVersion): ServiceAgreementVersionResponse {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    data: row.data,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}
