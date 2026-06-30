import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs for the citizen application/submission surface (feature 63). Workspace-free, like the rest
 * of the citizen API. The form-to-fill read is public; the `/me/applications` lifecycle is auth-only.
 */

// ── The form a citizen fills (public read) ───────────────────────────────────────────────────────

/** The form to render for an application: its kind + structure (`{schema,uischema}` or `{stages,…}`). */
export const applicationFormToFillSchema = z.object({
  serviceId: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  kind: z.string(),
  title: z.string(),
  structure: z.record(z.string(), z.unknown()),
});
export class ApplicationFormToFillDto extends createZodDto(applicationFormToFillSchema) {}

// ── Submission status (mirrors submission_versions.status) ────────────────────────────────────────

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

// ── My applications list (the "track your applications" read) ─────────────────────────────────────

export const myApplicationSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceVersionId: z.string(),
  serviceTitle: z.string(),
  /** The application method / form the citizen applied through (the row's title). */
  formTitle: z.string(),
  reference: z.string(),
  status: submissionStatusSchema,
  statusLabel: z.string(),
  lastUpdated: z.string(),
});
export type MyApplication = z.infer<typeof myApplicationSchema>;
export class MyApplicationListDto extends createZodDto(
  z.object({ items: z.array(myApplicationSchema) }),
) {}

// ── A single submission (create / resume / save / submit responses) ───────────────────────────────

export const submissionSchema = z.object({
  id: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  status: submissionStatusSchema,
  data: z.record(z.string(), z.unknown()),
  reference: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
});
export type SubmissionResponse = z.infer<typeof submissionSchema>;
export class SubmissionDto extends createZodDto(submissionSchema) {}

/**
 * The full view of one application for the application page: the submission + the form it was made
 * through (kind + render structure) + the owning service, so the page can show names and render the
 * submitted answers read-only.
 */
export const applicationDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: submissionStatusSchema,
  statusLabel: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  formTitle: z.string(),
  serviceId: z.string(),
  serviceTitle: z.string(),
  /** `basic-form` | `multi-stage-form` — how to render `structure` + `data`. */
  kind: z.string(),
  structure: z.record(z.string(), z.unknown()),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
});
export type ApplicationDetail = z.infer<typeof applicationDetailSchema>;
export class ApplicationDetailDto extends createZodDto(applicationDetailSchema) {}

// ── Request bodies ────────────────────────────────────────────────────────────────────────────────

/** Start (or resume) an application for a specific form version. */
export const createSubmissionSchema = z.object({ formVersionId: z.uuid() });
export class CreateSubmissionDto extends createZodDto(createSubmissionSchema) {}
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

/** Save-draft / submit payload — the collected answers. */
export const submissionDataSchema = z.object({ data: z.record(z.string(), z.unknown()) });
export class SubmissionDataDto extends createZodDto(submissionDataSchema) {}
export type SubmissionDataInput = z.infer<typeof submissionDataSchema>;
