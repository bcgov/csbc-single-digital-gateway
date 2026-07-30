import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs for the staff submissions-review surface (feature 65). Workspace-scoped (the caller must be a
 * member). Requests are validated by the global ZodValidationPipe; responses by @ZodSerializerDto.
 */

export const submissionStatusSchema = z.enum([
  'draft',
  'pending',
  'in_review',
  'approved',
  'rejected',
  'needs_changes',
  'withdrawn',
]);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

// ── Requests ────────────────────────────────────────────────────────────────────────────────────

/**
 * Paginated, sortable, searchable review-queue query (initiative `staff-list-query`). `status` is the
 * existing tab filter (composes with the always-on draft exclusion — feature 151); `q` is an ILIKE
 * substring over applicant name, service title, and the submission reference. `sort: 'status'` orders
 * by the workflow enum's definition order (pending → in_review → … → withdrawn).
 */
export const listSubmissionsQuerySchema = z.object({
  workspaceId: z.uuid(),
  status: submissionStatusSchema.optional(),
  q: z.string().trim().max(255).optional(),
  sort: z.enum(['submitted', 'updated', 'status']).default('submitted'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export class ListSubmissionsQueryDto extends createZodDto(listSubmissionsQuerySchema) {}
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;

/** A reviewer decision. Mapped server-side to a submission status + a `reviews.decision`. */
export const reviewSubmissionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'request_changes']),
  reason: z.string().trim().max(2000).optional(),
});
export class ReviewSubmissionDto extends createZodDto(reviewSubmissionSchema) {}
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;

// ── Responses ───────────────────────────────────────────────────────────────────────────────────

/** A submission as a review-queue row. */
export const submissionSummarySchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceTitle: z.string(),
  formId: z.string(),
  formTitle: z.string(),
  applicantName: z.string(),
  applicantEmail: z.string().nullable(),
  status: submissionStatusSchema,
  statusLabel: z.string(),
  reference: z.string(),
  submittedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type SubmissionSummary = z.infer<typeof submissionSummarySchema>;
/** Paginated review-queue envelope (initiative `staff-list-query`). */
export const submissionListResponseSchema = z.object({
  items: z.array(submissionSummarySchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type SubmissionListResponse = z.infer<typeof submissionListResponseSchema>;
export class SubmissionListDto extends createZodDto(submissionListResponseSchema) {}

/** One past review decision on the submission. */
export const reviewEntrySchema = z.object({
  id: z.string(),
  decision: z.string(),
  reason: z.string().nullable(),
  reviewerName: z.string(),
  createdAt: z.string(),
});
export type ReviewEntry = z.infer<typeof reviewEntrySchema>;

/** A submission + its answers, the form's render structure, and its review history. */
export const submissionDetailSchema = submissionSummarySchema.extend({
  kind: z.string(),
  structure: z.record(z.string(), z.unknown()),
  data: z.record(z.string(), z.unknown()),
  reviews: z.array(reviewEntrySchema),
});
export type SubmissionDetail = z.infer<typeof submissionDetailSchema>;
export class SubmissionDetailDto extends createZodDto(submissionDetailSchema) {}
