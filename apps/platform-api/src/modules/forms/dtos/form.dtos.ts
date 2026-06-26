import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Shared definition ───────────────────────────────────────────────────────────────────────────

const opaque = z.record(z.string(), z.unknown());

/** A basic-form definition = its JSON Schema + UI Schema (both opaque records). */
const basicFormDefinition = z.object({ schema: opaque, uischema: opaque });

/** A multi-stage-form definition = stages (each with pages = basic-forms) + flow edges (feature 43). */
const stagePageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  schema: opaque,
  uischema: opaque,
});
const stageSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  pages: z.array(stagePageSchema),
});
const stageEdgeSchema = z.object({ id: z.string(), source: z.string(), target: z.string() });
const multiStageDefinition = z.object({
  stages: z.array(stageSchema),
  edges: z.array(stageEdgeSchema).optional(),
});

/**
 * A form definition is either a basic-form (`{ schema, uischema }`) or a multi-stage form
 * (`{ stages, edges }`). Kept a union (not discriminated) so `createZodDto` wraps the OUTER
 * request/response objects without TS2509. Otherwise opaque — same posture as services.
 */
export const definitionSchema = z.union([basicFormDefinition, multiStageDefinition]);
export type DefinitionResponse = z.infer<typeof definitionSchema>;

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/** Standalone create: a form document + its draft v1 definition. */
export const createFormSchema = z.object({
  workspaceId: z.uuid(),
  typeId: z.uuid(),
  title: z.string().trim().min(1).max(255),
  definition: definitionSchema,
});
export class CreateFormDto extends createZodDto(createFormSchema) {}
export type CreateFormInput = z.infer<typeof createFormSchema>;

/** Edit a draft version's definition (and optionally retitle the document). */
export const updateFormSchemaSchema = z.object({
  definition: definitionSchema,
  title: z.string().trim().min(1).max(255).optional(),
});
export class UpdateFormSchemaDto extends createZodDto(updateFormSchemaSchema) {}
export type UpdateFormSchemaInput = z.infer<typeof updateFormSchemaSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const formSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  kind: z.string(),
  createdAt: z.string(),
});
export type FormResponse = z.infer<typeof formSchema>;

export const formVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  version: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  schema: definitionSchema,
  createdAt: z.string(),
});
export class FormVersionDto extends createZodDto(formVersionSchema) {}
export type FormVersionResponse = z.infer<typeof formVersionSchema>;

/** Create/get response: the form document + a single version. */
export const formWithVersionSchema = z.object({
  form: formSchema,
  version: formVersionSchema,
});
export class FormWithVersionDto extends createZodDto(formWithVersionSchema) {}
export type FormWithVersion = z.infer<typeof formWithVersionSchema>;

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

export function toFormDto(row: Document): FormResponse {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toFormVersionDto(row: DocumentVersion): FormVersionResponse {
  return {
    id: row.id,
    documentId: row.documentId,
    version: row.version,
    status: row.status,
    schema: (row.schema ?? { schema: {}, uischema: {} }) as {
      schema: Record<string, unknown>;
      uischema: Record<string, unknown>;
    },
    createdAt: row.createdAt.toISOString(),
  };
}
