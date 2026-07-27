import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Request ─────────────────────────────────────────────────────────────────────────────────────

/** Attach an existing PUBLISHED service agreement (workspace or global) to a service draft version. */
export const attachAgreementSchema = z.object({
  agreementDocumentId: z.uuid(),
});
export class AttachAgreementDto extends createZodDto(attachAgreementSchema) {}
export type AttachAgreementInput = z.infer<typeof attachAgreementSchema>;

// ── Response ────────────────────────────────────────────────────────────────────────────────────

export const agreementRefSchema = z.object({
  /** The document_references row id (used to detach). */
  id: z.string(),
  /** The agreement DOCUMENT this service points at (document-only — the version is resolved
   * current-published at read time; the reference pins no version). */
  agreementDocumentId: z.string(),
  title: z.string(),
  /** Whether the agreement is optional for applicants (from the agreement's published data). */
  isOptional: z.boolean(),
  /** Whether the agreement is a global (admin-authored) one. */
  isGlobal: z.boolean(),
  position: z.number().int(),
  createdAt: z.string(),
});
export class AgreementRefDto extends createZodDto(agreementRefSchema) {}
export type AgreementRefResponse = z.infer<typeof agreementRefSchema>;

export class AgreementRefListDto extends createZodDto(
  z.object({ items: z.array(agreementRefSchema) }),
) {}
