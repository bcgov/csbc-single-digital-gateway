import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const referenceRelationSchema = z.enum([
  'related_service',
  'application_form',
  'external_application',
]);
export type ReferenceRelation = z.infer<typeof referenceRelationSchema>;

/** An absolute `https://` URL (feature 131). Rejects other schemes (`http`, `javascript:`, `data:`),
 * relative paths, and malformed input — the value is rendered as a live link to citizens. */
export const httpsUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must be a valid https:// address');

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

/** Create/edit an external application method (feature 131): a labelled `https` link a service
 * offers instead of an in-portal form. `label` is the method name; `url` is the external destination. */
export const externalApplicationSchema = z.object({
  label: z.string().trim().min(1).max(255),
  url: httpsUrlSchema,
});
export class ExternalApplicationDto extends createZodDto(externalApplicationSchema) {}
export type ExternalApplicationInput = z.infer<typeof externalApplicationSchema>;

// ── Response ──────────────────────────────────────────────────────────────────────────────────

export const referenceSchema = z.object({
  id: z.string(),
  relation: referenceRelationSchema,
  position: z.number().int(),
  label: z.string().nullable(),
  /** For an `external_application` reference, the external `https` destination (from the target
   * version `data.url`); NULL for form/related references. */
  url: z.string().nullable(),
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
