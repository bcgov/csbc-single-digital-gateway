import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/**
 * A designed form definition authored in-browser before service save (client-first). Opaque object:
 * `{ schema, uischema }` for a basic-form, `{ stages, edges }` for a multi-stage-form (feature 43).
 * Stored verbatim into the new form's version; structure is validated by the builder + the type.
 */
const formDefinitionShape = z.record(z.string(), z.unknown());

/**
 * An application = a form reference (existing version OR a new form to create) + a button label.
 * A new form may carry a builder-authored `definition`; when omitted the type template is copied
 * (feature 41). Client-first: the form is only persisted when the service is saved (feature 40).
 */
export const applicationFormRefSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('existing'), versionId: z.uuid() }),
  z.object({
    mode: z.literal('new'),
    typeId: z.uuid(),
    title: z.string().trim().min(1).max(255),
    definition: formDefinitionShape.optional(),
  }),
]);
export const applicationInputSchema = z.object({
  /** Present = an existing reference (update reconcile); absent = a new application. */
  id: z.uuid().optional(),
  label: z.string().trim().min(1).max(255),
  position: z.number().int().min(0).default(0),
  form: applicationFormRefSchema,
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;

/** Composite create: the service + its draft v1 data + its application references, persisted atomically. */
export const createServiceSchema = z.object({
  workspaceId: z.uuid(),
  title: z.string().trim().min(1).max(255),
  data: z.record(z.string(), z.unknown()).default({}),
  applications: z.array(applicationInputSchema).default([]),
});
export class CreateServiceDto extends createZodDto(createServiceSchema) {}
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const listServicesQuerySchema = z.object({ workspaceId: z.uuid() });
export class ListServicesQueryDto extends createZodDto(listServicesQuerySchema) {}
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

/** Composite save of a draft version: form data + (optional) reconciled application references. */
export const updateVersionDataSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  title: z.string().trim().min(1).max(255).optional(),
  applications: z.array(applicationInputSchema).optional(),
});
export class UpdateVersionDataDto extends createZodDto(updateVersionDataSchema) {}
export type UpdateVersionDataInput = z.infer<typeof updateVersionDataSchema>;

/** Forms catalog entry — a workspace form document + the version to reference. */
export const formCatalogEntrySchema = z.object({
  documentId: z.string(),
  versionId: z.string(),
  title: z.string(),
  kind: z.string(),
});
export type FormCatalogEntry = z.infer<typeof formCatalogEntrySchema>;
export class FormCatalogListDto extends createZodDto(
  z.object({ items: z.array(formCatalogEntrySchema) }),
) {}

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
  /** Whether any of the service's application forms has submissions — gates delete (none) vs archive. */
  hasSubmissions: z.boolean(),
  /** Whether the latest version was ever published — un-archive reads "Publish" (true) vs "Restore". */
  latestPublished: z.boolean(),
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
export class DefinitionDto extends createZodDto(definitionSchema) {}
export type DefinitionResponse = z.infer<typeof definitionSchema>;
export const serviceDetailSchema = z.object({
  service: serviceSchema,
  versions: z.array(serviceVersionSchema),
  definition: definitionSchema,
  /** Whether any of the service's application forms has submissions — gates delete vs archive. */
  hasSubmissions: z.boolean(),
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
