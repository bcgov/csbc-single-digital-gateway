import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const referenceRelationSchema = z.enum(['related_service', 'application_form']);
export type ReferenceRelation = z.infer<typeof referenceRelationSchema>;

/** Add a reference from a service version to an existing service/form VERSION. */
export const addReferenceSchema = z.object({
  targetVersionId: z.uuid(),
  relation: referenceRelationSchema,
  label: z.string().trim().min(1).max(255).optional(),
});
export class AddReferenceDto extends createZodDto(addReferenceSchema) {}
export type AddReferenceInput = z.infer<typeof addReferenceSchema>;

/** Create a form document of `typeId` and reference it from this service version (atomic). An optional
 * builder-authored `definition` (basic `{schema,uischema}` or multi-stage `{stages,edges}`) is stored
 * instead of the type template (feature 44 — design-then-attach from the service detail). */
export const createReferencedFormSchema = z.object({
  typeId: z.uuid(),
  title: z.string().trim().min(1).max(255),
  label: z.string().trim().min(1).max(255).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
});
export class CreateReferencedFormDto extends createZodDto(createReferencedFormSchema) {}
export type CreateReferencedFormInput = z.infer<typeof createReferencedFormSchema>;

// ── Response ──────────────────────────────────────────────────────────────────────────────────

export const referenceSchema = z.object({
  id: z.string(),
  relation: referenceRelationSchema,
  position: z.number().int(),
  label: z.string().nullable(),
  targetDocumentId: z.string(),
  targetVersionId: z.string(),
  targetKind: z.string(),
  targetTitle: z.string(),
  targetVersion: z.number().int(),
  /** The target form version's lifecycle status (draft/published/archived). */
  targetStatus: z.string(),
  /** Whether the target form has any submissions — gates delete (none) vs archive (some). */
  hasSubmissions: z.boolean(),
  /** Whether the target form has authored structure (fields/stages/pages) — gates service publish. */
  hasStructure: z.boolean(),
  createdAt: z.string(),
});
export class ReferenceDto extends createZodDto(referenceSchema) {}
export type ReferenceResponse = z.infer<typeof referenceSchema>;
export class ReferenceListDto extends createZodDto(z.object({ items: z.array(referenceSchema) })) {}
