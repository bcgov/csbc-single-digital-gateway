import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  countries,
  documentVersions,
  reviews,
  submissionVersions,
  submissions,
  users,
  workspaceMembers,
  workspaces,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  type ApplicationDetail,
  type MyApplication,
  type SubmissionResponse,
  type SubmissionStatus,
} from '../dtos/application.dtos';
import { applicationReference, normalizeContent, submissionStatusLabel } from '../util/format';
import {
  draftTarget,
  linkedServiceVersion,
  moveDraft,
  neverSubmittedDraft,
} from './application-drafts';
import type { Env } from '../../../config/env.schema';
import { enqueueNotification } from '../../../notifications/enqueue';
import { staffSubmissionContent, submissionReceivedContent } from '../util/notification-content';
import {
  collectAddressLocks,
  collectAddressPostals,
  collectDecimalConstraints,
  validateAddressLocks,
  validateAddressPostals,
  validateDecimals,
  validateSubmission,
} from '../util/validate';

type SubmissionRow = typeof submissions.$inferSelect;
type SubmissionVersionRow = typeof submissionVersions.$inferSelect;

/**
 * The citizen application surface (feature 63): resolve the form to fill for a service, and run the
 * draft → submitted lifecycle over `submissions`/`submission_versions`. Everything is workspace-free
 * to the caller and scoped to the current user. No staff/review concerns live here.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Start an application on a published method version, resume the citizen's draft on it, or move their
   * never-submitted draft from an older version of the same method onto it (doc 292 rules 2-5).
   */
  async createOrResumeDraft(userId: string, formVersionId: string): Promise<SubmissionResponse> {
    const target = await draftTarget(this.db, formVersionId);
    const draft = await neverSubmittedDraft(this.db, userId, target.documentId);
    if (draft !== undefined) {
      const current =
        draft.submission.documentVersionId === formVersionId
          ? draft
          : await moveDraft(this.db, draft, formVersionId, target);
      return this.toDto(current.submission, current.version);
    }
    const { documentId, workspaceId } = target;
    return this.db.transaction(async (tx) => {
      const subIns = await tx
        .insert(submissions)
        .values({ documentId, documentVersionId: formVersionId, userId, workspaceId })
        .returning();
      const sub = subIns[0];
      if (sub === undefined) {
        throw new Error('submission insert returned no row');
      }
      const verIns = await tx
        .insert(submissionVersions)
        .values({ submissionId: sub.id, workspaceId, version: 1, data: {} })
        .returning();
      const ver = verIns[0];
      if (ver === undefined) {
        throw new Error('submission version insert returned no row');
      }
      return this.toDto(sub, ver);
    });
  }

  /**
   * The full view of one of the citizen's applications: the submission + the form it was made
   * through (kind + render structure) + the owning service. 404 if it isn't theirs.
   */
  async getDetail(userId: string, submissionId: string): Promise<ApplicationDetail> {
    const sub = await this.requireOwn(userId, submissionId);
    const ver = await this.requireLatest(submissionId);
    const [formVer] = await this.db
      .select({ title: documentVersions.title, content: documentVersions.content })
      .from(documentVersions)
      .where(eq(documentVersions.id, sub.documentVersionId))
      .limit(1);
    const reviewReason = await this.latestReviewReason(sub.id);
    return {
      id: sub.id,
      reference: applicationReference(sub.id, sub.createdAt),
      status: ver.status,
      statusLabel: submissionStatusLabel(ver.status),
      formId: sub.documentId,
      formVersionId: sub.documentVersionId,
      formTitle: formVer?.title ?? null,
      structure: normalizeContent(formVer?.content ?? {}),
      data: ver.data,
      reviewReason,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: ver.updatedAt.toISOString(),
      submittedAt: ver.submittedAt?.toISOString() ?? null,
    };
  }

  /**
   * Open a draft revision of an application the reviewer has sent back (`needs_changes`). Seeds the
   * new version from the last answers so the citizen edits from where they left off, then the
   * existing saveDraft/submit flow applies (the latest version is a draft again). The reviewed
   * version and its review row are left untouched — the revision is a new version (N+1).
   */
  async revise(userId: string, submissionId: string): Promise<SubmissionResponse> {
    const sub = await this.requireOwn(userId, submissionId);
    const latest = await this.requireLatest(submissionId);
    if (latest.status !== 'needs_changes') {
      throw new ConflictException('This application is not awaiting changes');
    }
    const verIns = await this.db
      .insert(submissionVersions)
      .values({
        submissionId: sub.id,
        workspaceId: latest.workspaceId,
        version: latest.version + 1,
        data: latest.data,
      })
      .returning();
    return this.toDto(sub, this.expectRow(verIns[0]));
  }

  /** Save in-progress answers (only while the application is still a draft). */
  async saveDraft(
    userId: string,
    submissionId: string,
    data: Record<string, unknown>,
  ): Promise<SubmissionResponse> {
    const sub = await this.requireOwn(userId, submissionId);
    const ver = await this.requireDraft(submissionId);
    const updated = await this.db
      .update(submissionVersions)
      .set({ data })
      .where(eq(submissionVersions.id, ver.id))
      .returning();
    return this.toDto(sub, this.expectRow(updated[0]));
  }

  /**
   * Resolve each address field's postal code against the entered country's regex (from geo reference
   * data). Returns error strings (empty = all valid). Countries with no known regex impose no
   * constraint; no address fields → no DB read.
   */
  private async validateAddressPostals(
    structure: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<string[]> {
    const entries = collectAddressPostals(structure, data);
    if (entries.length === 0) {
      return [];
    }
    const names = [...new Set(entries.map((entry) => entry.country))];
    const rows = await this.db
      .select({ name: countries.name, regex: countries.postalCodeRegex })
      .from(countries)
      .where(inArray(countries.name, names));
    const regexByCountry = new Map(rows.map((row) => [row.name, row.regex]));
    return validateAddressPostals(entries, (country) => regexByCountry.get(country) ?? null);
  }

  /**
   * Submit the application: validate the answers against the form schema (422 on failure), then
   * persist the final answers and advance draft → pending. Validation runs only here — drafts are
   * intentionally partial and are never validated.
   */
  async submit(
    userId: string,
    submissionId: string,
    data: Record<string, unknown>,
  ): Promise<SubmissionResponse> {
    const sub = await this.requireOwn(userId, submissionId);
    const ver = await this.requireDraft(submissionId);
    const form = await this.loadFormStructure(sub.documentVersionId);
    const result = validateSubmission(form.structure, data);
    if (!result.valid) {
      throw new UnprocessableEntityException({
        message: 'The application has validation errors',
        errors: result.errors,
      });
    }
    // Number fields (feature 155): enforce each decimal field's decimal-places limit (options.decimals).
    // Checked here rather than via schema `multipleOf`, which is floating-point fragile.
    const decimalErrors = validateDecimals(collectDecimalConstraints(form.structure), data);
    if (decimalErrors.length > 0) {
      throw new UnprocessableEntityException({
        message: 'The application has validation errors',
        errors: decimalErrors,
      });
    }
    // Address fields (feature 153): postal codes are validated against the entered country's regex
    // (resolved from geo reference data — country-dependent, so it can't live in the static schema).
    const postalErrors = await this.validateAddressPostals(form.structure, data);
    if (postalErrors.length > 0) {
      throw new UnprocessableEntityException({
        message: 'The application has validation errors',
        errors: postalErrors,
      });
    }
    // Address locks (feature 170): a sub-field the author marked read-only must equal the default it
    // was pinned to. The rendered field is read-only, but that is UX only — this is the enforcement
    // point for a request crafted outside the UI.
    const lockErrors = validateAddressLocks(collectAddressLocks(form.structure), data);
    if (lockErrors.length > 0) {
      throw new UnprocessableEntityException({
        message: 'The application has validation errors',
        errors: lockErrors,
      });
    }
    // Feature 217: the consent gate ("every required service agreement must be approved") is gone
    // with `document_references` — an application no longer knows which agreements apply to it.
    // Pre-resolve the citizen's contact email (read BEFORE the tx) for the notification seed.
    const [owner] = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    // Pre-resolve the staff audience (feature 124): the owning workspace's slug (staff routes are
    // workspace-scoped), the service title for the message, and every ACTIVE member + email seed.
    const [workspace] = await this.db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, sub.workspaceId))
      .limit(1);
    // Doc 292 rule 9: the staff message names the SERVICE again — the published one that links to this method
    // (doc 290 `document_links`); the method's own title when none does.
    const service = await linkedServiceVersion(this.db, sub.documentId);
    const [formRef] = await this.db
      .select({ title: documentVersions.title })
      .from(documentVersions)
      .where(eq(documentVersions.id, sub.documentVersionId))
      .limit(1);
    const serviceTitle = service?.title ?? formRef?.title ?? null;
    const members = await this.db
      .select({ userId: workspaceMembers.userId, email: users.email })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, sub.workspaceId),
          eq(workspaceMembers.status, 'active'),
        ),
      );
    // Advance draft → pending and queue the received-confirmation in the SAME transaction
    // (the outbox guarantee, doc 109). One confirmation per submitted VERSION — a resubmit
    // after needs_changes is a new version and gets its own.
    const updated = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(submissionVersions)
        .set({ data, status: 'pending', submittedAt: new Date() })
        .where(eq(submissionVersions.id, ver.id))
        .returning();
      const content = submissionReceivedContent(applicationReference(sub.id, sub.createdAt));
      // Email deep links (feature 127), composed from config — never user input.
      const citizenWebUrl = this.config.get('CITIZEN_WEB_URL', { infer: true });
      const platformWebUrl = this.config.get('PLATFORM_WEB_URL', { infer: true });
      await enqueueNotification(tx, {
        idempotencyKey: `submission:${ver.id}`,
        userId,
        type: content.type,
        title: content.title,
        body: content.body,
        payload: {
          submissionId: sub.id,
          link: new URL(`/applications/${sub.id}`, citizenWebUrl).href,
          linkLabel: 'View application',
        },
        email: owner?.email ?? null,
      });
      // Staff alert per ACTIVE workspace member (feature 124) — same tx, per-member rows so each
      // has their own read-state and preferences. Staff and citizens are distinct principals, so
      // no self-exclusion is needed.
      const staffContent = staffSubmissionContent(
        applicationReference(sub.id, sub.createdAt),
        serviceTitle,
      );
      for (const member of members) {
        // eslint-disable-next-line no-await-in-loop -- sequential writes share one tx connection
        await enqueueNotification(tx, {
          idempotencyKey: `submission:${ver.id}:staff:${member.userId}`,
          userId: member.userId,
          type: staffContent.type,
          title: staffContent.title,
          body: staffContent.body,
          payload: {
            submissionId: sub.id,
            workspaceSlug: workspace?.slug ?? null,
            ...(workspace?.slug !== undefined && {
              link: new URL(`/app/${workspace.slug}/submissions/${sub.id}`, platformWebUrl).href,
              linkLabel: 'Review application',
            }),
          },
          email: member.email,
        });
      }
      return rows;
    });
    return this.toDto(sub, this.expectRow(updated[0]));
  }

  /** The citizen's applications, newest first — resolved to their owning service (workspace-free). */
  async listMine(userId: string): Promise<MyApplication[]> {
    const subs = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));
    const items = await Promise.all(subs.map((sub) => this.toMyApplication(sub)));
    return items.filter((item): item is MyApplication => item !== null);
  }

  /**
   * Feature 217: this used to resolve the OWNING SERVICE through the form's `application_form`
   * reference, and returned `null` — hiding the row — when there was none. With references gone
   * there is no service to name, and no reason to hide a submission: every one of the citizen's
   * applications is now listed, identified by the form it was made on.
   */
  private async toMyApplication(sub: SubmissionRow): Promise<MyApplication | null> {
    const [form] = await this.db
      .select({ title: documentVersions.title })
      .from(documentVersions)
      .where(eq(documentVersions.id, sub.documentVersionId))
      .limit(1);
    const [ver, service] = await Promise.all([
      this.latestVersion(sub.id),
      linkedServiceVersion(this.db, sub.documentId),
    ]);
    const status: SubmissionStatus = ver?.status ?? 'draft';
    return {
      id: sub.id,
      // Doc 292 rule 7: where a draft row sends the citizen back to (its apply page).
      serviceId: service?.serviceId ?? null,
      formId: sub.documentId,
      formVersionId: sub.documentVersionId,
      formTitle: form?.title ?? null,
      reference: applicationReference(sub.id, sub.createdAt),
      status,
      statusLabel: submissionStatusLabel(status),
      lastUpdated: (ver?.updatedAt ?? sub.updatedAt).toISOString(),
    };
  }

  /** The form version's normalized render/validation structure (for submit validation). */
  private async loadFormStructure(
    formVersionId: string,
  ): Promise<{ structure: Record<string, unknown> }> {
    const rows = await this.db
      .select({ content: documentVersions.content })
      .from(documentVersions)
      .where(eq(documentVersions.id, formVersionId))
      .limit(1);
    const row = rows[0];
    if (row === undefined) {
      throw new NotFoundException('Application form not found');
    }
    return { structure: normalizeContent(row.content) };
  }

  /** The most recent reviewer note for a submission (for the citizen banner), or null. */
  private async latestReviewReason(submissionId: string): Promise<string | null> {
    const rows = await this.db
      .select({ reason: reviews.reason })
      .from(reviews)
      .where(eq(reviews.submissionId, submissionId))
      .orderBy(desc(reviews.createdAt))
      .limit(1);
    return rows[0]?.reason ?? null;
  }

  private async latestVersion(submissionId: string): Promise<SubmissionVersionRow | null> {
    const rows = await this.db
      .select()
      .from(submissionVersions)
      .where(eq(submissionVersions.submissionId, submissionId))
      .orderBy(desc(submissionVersions.version))
      .limit(1);
    return rows[0] ?? null;
  }

  private async requireOwn(userId: string, submissionId: string): Promise<SubmissionRow> {
    const rows = await this.db
      .select()
      .from(submissions)
      .where(and(eq(submissions.id, submissionId), eq(submissions.userId, userId)))
      .limit(1);
    const sub = rows[0];
    if (sub === undefined) {
      throw new NotFoundException('Application not found');
    }
    return sub;
  }

  private async requireLatest(submissionId: string): Promise<SubmissionVersionRow> {
    const ver = await this.latestVersion(submissionId);
    if (ver === null) {
      throw new NotFoundException('Application not found');
    }
    return ver;
  }

  private async requireDraft(submissionId: string): Promise<SubmissionVersionRow> {
    const ver = await this.requireLatest(submissionId);
    if (ver.status !== 'draft') {
      throw new ConflictException('This application has already been submitted');
    }
    return ver;
  }

  private expectRow(row: SubmissionVersionRow | undefined): SubmissionVersionRow {
    if (row === undefined) {
      throw new Error('submission version update returned no row');
    }
    return row;
  }

  private toDto(submission: SubmissionRow, version: SubmissionVersionRow): SubmissionResponse {
    return {
      id: submission.id,
      formId: submission.documentId,
      formVersionId: submission.documentVersionId,
      status: version.status,
      data: version.data,
      reference: applicationReference(submission.id, submission.createdAt),
      createdAt: submission.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
      submittedAt: version.submittedAt?.toISOString() ?? null,
    };
  }
}
