import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/** Create a service: pick a workspace + an initial title. The Service document type is resolved server-side. */
export const createServiceSchema = z.object({
  workspaceId: z.uuid(),
  title: z.string().trim().min(1).max(255),
});
export class CreateServiceDto extends createZodDto(createServiceSchema) {}
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const listServicesQuerySchema = z.object({ workspaceId: z.uuid() });
export class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

/** Save a draft version's form data (validated against the type schema only at publish time). */
export const updateVersionDataSchema = z.object({ data: z.record(z.string(), z.unknown()) });
export class UpdateVersionDataDto extends createZodDto(updateVersionDataSchema) {}
export type UpdateVersionDataInput = z.infer<typeof updateVersionDataSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const serviceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
});
export type ServiceResponse = z.infer<typeof serviceSchema>;

export const serviceVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  version: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  data: z.record(z.string(), z.unknown()),
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
});
export type ServiceSummary = z.infer<typeof serviceSummarySchema>;
export class ServiceListDto extends createZodDto(
  z.object({ items: z.array(serviceSummarySchema) }),
) {}

/** Create response: the service + its versions. */
export const serviceWithVersionsSchema = z.object({
  service: serviceSchema,
  versions: z.array(serviceVersionSchema),
});
export class ServiceWithVersionsDto extends createZodDto(serviceWithVersionsSchema) {}
export type ServiceWithVersions = z.infer<typeof serviceWithVersionsSchema>;

/** Detail response: the service, its versions, and the Service form definition to render. */
export const definitionSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
  uischema: z.record(z.string(), z.unknown()),
});
export const serviceDetailSchema = z.object({
  service: serviceSchema,
  versions: z.array(serviceVersionSchema),
  definition: definitionSchema,
});
export class ServiceDetailDto extends createZodDto(serviceDetailSchema) {}
export type ServiceDetail = z.infer<typeof serviceDetailSchema>;

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

export function toServiceDto(row: Document): ServiceResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toServiceVersionDto(row: DocumentVersion): ServiceVersionResponse {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    status: row.status,
    data: row.data,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}
