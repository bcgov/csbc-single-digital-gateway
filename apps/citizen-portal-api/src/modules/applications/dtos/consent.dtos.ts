import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** The canonical consent decision (independent of the agreement's authored labels). */
export const consentDecisionSchema = z.enum(['approve', 'reject']);
export type ConsentDecision = z.infer<typeof consentDecisionSchema>;

// ── Request ─────────────────────────────────────────────────────────────────────────────────────

/** Record the citizen's decision on a specific published agreement version. */
export const recordConsentSchema = z.object({
  agreementVersionId: z.uuid(),
  decision: consentDecisionSchema,
});
export class RecordConsentDto extends createZodDto(recordConsentSchema) {}
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;

// ── Response ────────────────────────────────────────────────────────────────────────────────────

export const consentAckSchema = z.object({
  agreementVersionId: z.string(),
  decision: consentDecisionSchema,
});
export class ConsentAckDto extends createZodDto(consentAckSchema) {}

/** One agreement a service requires + the caller's current decision (null = undecided). */
export const serviceAgreementConsentSchema = z.object({
  /** The agreement's CURRENTLY-published version (consent is keyed to it — resets per version). */
  agreementVersionId: z.string(),
  agreementDocumentId: z.string(),
  /** The authored fields (title, description, content, isOptional, approveLabel, rejectLabel). */
  data: z.record(z.string(), z.unknown()),
  decision: consentDecisionSchema.nullable(),
});
export type ServiceAgreementConsentItem = z.infer<typeof serviceAgreementConsentSchema>;
export class ServiceAgreementConsentListDto extends createZodDto(
  z.object({ items: z.array(serviceAgreementConsentSchema) }),
) {}
