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

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const serviceAgreementSchema = z.object({
  id: z.string(),
  // Nullable: a global (admin-authored) agreement has no workspace.
  workspaceId: z.string().nullable(),
  title: z.string(),
  kind: z.string(),
  createdAt: z.string(),
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

/** Detail: the agreement + all its versions + the type definition to render the editor. */
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

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

export function toAgreementDto(row: Document): ServiceAgreementResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
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
