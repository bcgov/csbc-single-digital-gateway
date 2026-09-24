import type { Document, DocumentVersion } from '@repo/database';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { studioDocumentSchema } from '../../templates/dtos/template.dtos';

/**
 * Feature 217. A "form" is an APPLICATION METHOD document (`type = 'application-method'`) — the
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
  /** Omitted = start from the published application-method template. */
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
  type: z.literal('application-method'),
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
export const formWithVersionSchema = z.object({
  form: formSchema,
  version: formVersionSchema,
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
  if (row.type !== 'application-method') {
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
