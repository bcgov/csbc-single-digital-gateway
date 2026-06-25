import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const referenceRelationSchema = z.enum(['related_service', 'application_form']);
export type ReferenceRelation = z.infer<typeof referenceRelationSchema>;

/** Add a reference from a service version to an existing service/form VERSION. */
export const addReferenceSchema = z.object({
  targetVersionId: z.uuid(),
  relation: referenceRelationSchema,
});
export class AddReferenceDto extends createZodDto(addReferenceSchema) {}
export type AddReferenceInput = z.infer<typeof addReferenceSchema>;

/** Create a form document of `typeId` and reference it from this service version (atomic). */
export const createReferencedFormSchema = z.object({
  typeId: z.uuid(),
  title: z.string().trim().min(1).max(255),
});
export class CreateReferencedFormDto extends createZodDto(createReferencedFormSchema) {}
export type CreateReferencedFormInput = z.infer<typeof createReferencedFormSchema>;

// ── Response ──────────────────────────────────────────────────────────────────────────────────

export const referenceSchema = z.object({
  id: z.string(),
  relation: referenceRelationSchema,
  position: z.number().int(),
  targetDocumentId: z.string(),
  targetVersionId: z.string(),
  targetKind: z.string(),
  targetTitle: z.string(),
  targetVersion: z.number().int(),
  createdAt: z.string(),
});
export class ReferenceDto extends createZodDto(referenceSchema) {}
export type ReferenceResponse = z.infer<typeof referenceSchema>;
export class ReferenceListDto extends createZodDto(z.object({ items: z.array(referenceSchema) })) {}
