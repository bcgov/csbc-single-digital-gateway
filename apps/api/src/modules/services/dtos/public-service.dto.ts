import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PaginationQuerySchema } from './common.dto';

export const PublicServiceListQuerySchema = PaginationQuerySchema.extend({
  locale: z.string().min(1).default('en'),
  serviceTypeId: z.string().uuid().optional(),
  orgUnitId: z.string().uuid().optional(),
});

export class PublicServiceListQueryDto extends createZodDto(
  PublicServiceListQuerySchema,
) {}

export const PublicServiceDetailQuerySchema = z.object({
  locale: z.string().min(1).default('en'),
});

export class PublicServiceDetailQueryDto extends createZodDto(
  PublicServiceDetailQuerySchema,
) {}

// ── Contact method item types ───────────────────────────────────────

const BaseItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  description: z.string().optional(),
});

const AddressItemSchema = BaseItemSchema.extend({
  type: z.literal('address'),
  addressOne: z.string(),
  addressTwo: z.string().optional(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

const LinkItemSchema = BaseItemSchema.extend({
  type: z.literal('link'),
  url: z.string(),
});

const PhoneItemSchema = BaseItemSchema.extend({
  type: z.literal('phone'),
  value: z.string(),
});

const FaxItemSchema = BaseItemSchema.extend({
  type: z.literal('fax'),
  value: z.string(),
});

const ValueItemSchema = BaseItemSchema.extend({
  type: z.literal('value'),
  value: z.string(),
});

const ContactMethodItemSchema = z.discriminatedUnion('type', [
  AddressItemSchema,
  LinkItemSchema,
  PhoneItemSchema,
  FaxItemSchema,
  ValueItemSchema,
]);

// ── Application types ───────────────────────────────────────────────

const BaseApplicationSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  description: z.string().optional(),
});

const ExternalApplicationSchema = BaseApplicationSchema.extend({
  type: z.literal('external'),
});

const WorkflowApplicationSchema = BaseApplicationSchema.extend({
  type: z.literal('workflow'),
  config: z.object({
    apiKey: z.string(),
    tenantId: z.string().uuid(),
    triggerEndpoint: z.string(),
    workflowId: z.string().min(1),
  }),
});

const ApplicationSchema = z.discriminatedUnion('type', [
  ExternalApplicationSchema,
  WorkflowApplicationSchema,
]);

// ── Public-safe application (config stripped) ───────────────────────

const PublicApplicationSchema = BaseApplicationSchema.extend({
  type: z.enum(['external', 'workflow']),
});

// ── FAQ ─────────────────────────────────────────────────────────────

const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

// ── Resources ───────────────────────────────────────────────────────

const ResourcesSchema = z.object({
  legal: z.array(LinkItemSchema),
  otherServices: z.object({
    recommendedServices: z.array(LinkItemSchema),
    relatedServices: z.array(LinkItemSchema),
  }),
  recommendedReading: z.array(LinkItemSchema),
});

// ── Service content (internal — before sanitisation) ────────────────

export const ServiceContentSchema = z.object({
  applications: z.array(ApplicationSchema).default([]),
  about: z.string().optional(),
  audience: z.string().optional(),
  considerations: z.string().optional(),
  outcomes: z.string().optional(),
  contactMethods: z.array(ContactMethodItemSchema).default([]),
  faq: z.array(FaqItemSchema).optional(),
  consents: z.array(z.object({})).default([]),
  resources: ResourcesSchema.default({
    legal: [],
    otherServices: { recommendedServices: [], relatedServices: [] },
    recommendedReading: [],
  }),
});

export type ServiceContent = z.infer<typeof ServiceContentSchema>;

// ── Public service content (safe for unauthenticated consumers) ─────

export const PublicServiceContentSchema = z.object({
  applications: z.array(PublicApplicationSchema).default([]),
  about: z.string().optional(),
  audience: z.string().optional(),
  considerations: z.string().optional(),
  outcomes: z.string().optional(),
  contactMethods: z.array(ContactMethodItemSchema).default([]),
  faq: z.array(FaqItemSchema).optional(),
  consents: z.array(z.object({})).default([]),
  resources: ResourcesSchema.default({
    legal: [],
    otherServices: { recommendedServices: [], relatedServices: [] },
    recommendedReading: [],
  }),
});

export type PublicServiceContent = z.infer<typeof PublicServiceContentSchema>;

// ── Public service schema ───────────────────────────────────────────

export const PublicServiceSchema = z.object({
  id: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  versionId: z.string().uuid(),
  publishedAt: z.string(),
  locale: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  content: PublicServiceContentSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class PublicServiceDto extends createZodDto(PublicServiceSchema) {}

// ── Sanitisation helper ─────────────────────────────────────────────

/**
 * Strip sensitive fields (e.g. workflow config) from service content
 * before returning it to public, unauthenticated consumers.
 */
export function sanitizeContentForPublic(
  content: Record<string, unknown>,
): Record<string, unknown> {
  if (!Array.isArray(content.applications)) {
    return content;
  }

  return {
    ...content,
    applications: (content.applications as Record<string, unknown>[]).map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ config: _config, ...rest }) => rest,
    ),
  };
}
