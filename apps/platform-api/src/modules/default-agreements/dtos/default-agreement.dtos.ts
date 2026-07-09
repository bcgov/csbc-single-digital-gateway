import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Request ─────────────────────────────────────────────────────────────────────────────────────

/** Add a published service agreement (workspace or global) as a workspace default. */
export const addDefaultAgreementSchema = z.object({
  agreementDocumentId: z.uuid(),
});
export class AddDefaultAgreementDto extends createZodDto(addDefaultAgreementSchema) {}
export type AddDefaultAgreementInput = z.infer<typeof addDefaultAgreementSchema>;

// ── Response ────────────────────────────────────────────────────────────────────────────────────

export const defaultAgreementSchema = z.object({
  /** The `workspace_default_agreements` row id (used to remove). */
  id: z.string(),
  /** The agreement DOCUMENT — resolved to its current published version for display. */
  agreementDocumentId: z.string(),
  title: z.string(),
  isOptional: z.boolean(),
  isGlobal: z.boolean(),
  createdAt: z.string(),
});
export class DefaultAgreementDto extends createZodDto(defaultAgreementSchema) {}
export type DefaultAgreementResponse = z.infer<typeof defaultAgreementSchema>;

export class DefaultAgreementListDto extends createZodDto(
  z.object({ items: z.array(defaultAgreementSchema) }),
) {}
