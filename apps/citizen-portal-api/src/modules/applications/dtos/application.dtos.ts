import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs for the citizen application/submission surface (feature 63). Workspace-free, like the rest
 * of the citizen API; the `/me/applications` lifecycle is auth-only.
 *
 * Feature 217: the public form-to-fill read is gone (it resolved a form through the service's
 * `application_form` references), and so is every "owning service" field — a submission's document
 * is the FORM, and the service was only ever reachable through a reference. `kind` is gone too:
 * a form is one `{ schema, variants }` document (doc 275), and a routed application is a `Funnel` root inside
 * each variant.
 */

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
  formId: z.string(),
  formVersionId: z.string(),
  /** The application method / form the citizen applied through — its version's generated title. */
  formTitle: z.string().nullable(),
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
 * through, so the page can show the name and render the submitted answers read-only.
 */
export const applicationDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: submissionStatusSchema,
  statusLabel: z.string(),
  formId: z.string(),
  formVersionId: z.string(),
  formTitle: z.string().nullable(),
  /** The authored document to render `data` against: `{ schema, variants }` (doc 275). */
  structure: z.record(z.string(), z.unknown()),
  data: z.record(z.string(), z.unknown()),
  /** The latest reviewer note (from `reviews.reason`), surfaced for rejected / action-needed. */
  reviewReason: z.string().nullable(),
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
