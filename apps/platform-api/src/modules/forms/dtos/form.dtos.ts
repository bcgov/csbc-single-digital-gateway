import { DOCUMENT_TYPE } from '@repo/database';
import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { studioDocumentSchema } from '../../templates/dtos/template.dtos';

/**
 * Feature 217. A "form" is an APPLICATION METHOD document (`type = 'services.service-application-method'`) — the
 * old `basic-form` / `multi-stage-form` / `external-application` kinds all collapsed into it.
 * Which flavour a method is now shows in its `content.uischema` root (`Form` for one page of
 * fields, `Flow` for stages), not in a column, so there is no per-kind definition union left: the
 * payload is one `StudioDocument`.
 */

// ── Request schemas + DTOs (validated by the global ZodValidationPipe) ──────────────────────────

/** Standalone create: an application-method document + its draft v1 content. */
export const createFormSchema = z.object({
  workspaceId: z.uuid(),
  title: z.string().trim().min(1).max(255),
  /** Doc 228: the template to build from. Omitted = the only published one of this type. */
  templateId: z.uuid().optional(),
  /** Omitted = start from the template's content. */
  content: studioDocumentSchema.optional(),
});
export class CreateFormDto extends createZodDto(createFormSchema) {}
export type CreateFormInput = z.infer<typeof createFormSchema>;

/** Edit a draft version's content. */
export const updateFormContentSchema = z.object({ content: studioDocumentSchema });
export class UpdateFormContentDto extends createZodDto(updateFormContentSchema) {}
export type UpdateFormContentInput = z.infer<typeof updateFormContentSchema>;

// ── Response schemas + DTOs ─────────────────────────────────────────────────────────────────────

export const formSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  /** From the version's GENERATED title — NULL when its content carries no root label. */
  title: z.string().nullable(),
  type: z.literal(DOCUMENT_TYPE.applicationMethod),
  createdAt: z.string(),
});
export type FormResponse = z.infer<typeof formSchema>;

export const formVersionSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  versionNumber: z.number().int(),
  revision: z.number().int(),
  status: z.enum(['draft', 'published', 'archived']),
  title: z.string().nullable(),
  description: z.string().nullable(),
  content: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});
export class FormVersionDto extends createZodDto(formVersionSchema) {}
export type FormVersionResponse = z.infer<typeof formVersionSchema>;

/** Create/get response: the form document + a single version. */
/**
 * Doc 221: the template a form version renders against, resolved by the PINNED template version
 * (`document_versions.template_version_id`, doc 217) rather than whichever one is published now.
 *
 * ABSENT when the version is pinned to nothing. Wired ahead of a page consuming it, deliberately, so
 * all three document types resolve their template identically and the next surface needs no new
 * plumbing.
 */
export const formDefinitionSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
  uischema: z.record(z.string(), z.unknown()),
  capabilities: z.record(z.string(), z.unknown()).optional(),
});

export const formWithVersionSchema = z.object({
  form: formSchema,
  version: formVersionSchema,
  definition: formDefinitionSchema.optional(),
});
export class FormWithVersionDto extends createZodDto(formWithVersionSchema) {}
export type FormWithVersion = z.infer<typeof formWithVersionSchema>;

// ── Row → DTO mappers ───────────────────────────────────────────────────────────────────────────

export function toFormDto(row: Document, version?: Pick<DocumentVersion, 'title'>): FormResponse {
  if (row.workspaceId === null) {
    // A form is always workspace-scoped (only service agreements may be global); a
    // workspace-less form document is a data invariant violation, not a valid response.
    throw new Error('form document has no workspace');
  }
  if (row.type !== DOCUMENT_TYPE.applicationMethod) {
    throw new Error(`document ${row.id} is a ${row.type}, not an application method`);
  }
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: version?.title ?? null,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toFormVersionDto(row: DocumentVersion): FormVersionResponse {
  return {
    id: row.id,
    documentId: row.documentId,
    versionNumber: row.versionNumber,
    revision: row.revision,
    status: row.status,
    title: row.title,
    description: row.description,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}
