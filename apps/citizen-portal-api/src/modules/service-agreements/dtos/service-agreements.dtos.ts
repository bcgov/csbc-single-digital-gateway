import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/** One approved agreement in the citizen's history — list item (title from the consented version). */
export const serviceAgreementListItemSchema = z.object({
  /** The consent row id (the approval event) — the detail route param. */
  id: z.string(),
  agreementDocumentId: z.string(),
  title: z.string(),
  /** When the citizen approved (ISO 8601). */
  consentedAt: z.string(),
});
export type ServiceAgreementListItem = z.infer<typeof serviceAgreementListItemSchema>;
export class ServiceAgreementListDto extends createZodDto(
  z.object({ items: z.array(serviceAgreementListItemSchema) }),
) {}

/** The full content of one agreement decision — detail. */
export const serviceAgreementDetailSchema = z.object({
  id: z.string(),
  agreementDocumentId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  /** The staff-authored Lexical content of the consented version (rendered read-only). */
  content: z.unknown(),
  /** The recorded decision on this consent event, and the agreement's authored choice labels. */
  decision: z.enum(['approve', 'reject']),
  approveLabel: z.string(),
  rejectLabel: z.string(),
  consentedAt: z.string(),
});
export type ServiceAgreementDetail = z.infer<typeof serviceAgreementDetailSchema>;
export class ServiceAgreementDetailDto extends createZodDto(serviceAgreementDetailSchema) {}
