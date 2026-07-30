import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type Database,
  documentReferences,
  documentVersions,
  documents,
  reviews,
  submissionVersions,
  submissions,
  users,
  workspaceMembers,
} from '@repo/database';
import { InjectDatabase } from '@repo/nestjs/database';
import { and, desc, eq } from 'drizzle-orm';
import {
  type ListSubmissionsQuery,
  type ReviewEntry,
  type ReviewSubmissionInput,
  type SubmissionDetail,
  type SubmissionStatus,
  type SubmissionSummary,
} from '../dtos/submission.dtos';
import type { Env } from '../../../config/env.schema';
import { enqueueNotification } from '../../../notifications/enqueue';
import {
  isStaffVisibleSubmission,
  normalizeFormStructure,
  submissionReference,
  submissionStatusLabel,
} from '../util/format';
import { reviewNotificationContent } from '../util/notification-content';

type SubmissionRow = typeof submissions.$inferSelect;
type SubmissionVersionRow = typeof submissionVersions.$inferSelect;

/** A reviewer decision → the submission status it sets + the recorded `reviews.decision`. */
const DECISION_MAP = {
  approve: { status: 'approved', decision: 'approved' },
  reject: { status: 'rejected', decision: 'rejected' },
  request_changes: { status: 'needs_changes', decision: 'needs_changes' },
} as const;

const REVIEWABLE: ReadonlySet<SubmissionStatus> = new Set(['pending', 'in_review']);

/**
 * Staff review surface over `submissions`/`submission_versions` (feature 65). Workspace-scoped — the
 * caller must be a member (404 otherwise). Read the queue + a submission's answers, and record a
 * review decision that advances the submission's status. Citizen-facing concerns live elsewhere.
 */
@Injectable()
export class SubmissionsService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** The caller must be a member of the workspace; 404 otherwise (existence not leaked). */
  private async requireMembership(userId: string, workspaceId: string): Promise<void> {
    const rows = await this.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
      )
      .limit(1);
    if (rows[0] === undefined) {
      throw new NotFoundException('Workspace not found');
    }
  }

  /** All submissions in a workspace (optionally filtered by status), newest first. */
  async list(userId: string, query: ListSubmissionsQuery): Promise<SubmissionSummary[]> {
    await this.requireMembership(userId, query.workspaceId);
    const subs = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.workspaceId, query.workspaceId))
      .orderBy(desc(submissions.createdAt));
    const items = await Promise.all(subs.map((sub) => this.toSummary(sub)));
    // Staff never see un-submitted drafts (feature 151) — so `?status=draft` also yields [].
    return items.filter(
      (item): item is SubmissionSummary =>
        item !== null &&
        isStaffVisibleSubmission(item.status) &&
        (query.status === undefined || item.status === query.status),
    );
  }

  /** A submission's answers + form render structure + review history. 404 outside the workspace. */
  async get(userId: string, submissionId: string): Promise<SubmissionDetail> {
    const sub = await this.requireSubmission(submissionId);
    await this.requireMembership(userId, sub.workspaceId);
    const summary = await this.toSummary(sub);
    // Drafts are citizen-private; staff can't view one even by direct id (feature 151).
    if (summary === null || !isStaffVisibleSubmission(summary.status)) {
      throw new NotFoundException('Submission not found');
    }
    const [version] = await this.db
      .select({ data: submissionVersions.data })
      .from(submissionVersions)
      .where(eq(submissionVersions.submissionId, sub.id))
      .orderBy(desc(submissionVersions.version))
      .limit(1);
    const [form] = await this.db
      .select({ kind: documents.kind, structure: documentVersions.schema })
      .from(documentVersions)
      .innerJoin(documents, eq(documents.id, documentVersions.documentId))
      .where(eq(documentVersions.id, sub.documentVersionId))
      .limit(1);
    const kind = form?.kind ?? 'basic-form';
    return {
      ...summary,
      kind,
      structure: normalizeFormStructure(kind, form?.structure ?? {}),
      data: version?.data ?? {},
      reviews: await this.reviewsFor(sub.id),
    };
  }

  /**
   * Record a review decision: insert an (append-only) `reviews` row and advance the latest
   * submission version's status, atomically. Only `pending`/`in_review` submissions are reviewable.
   */
  async review(
    userId: string,
    submissionId: string,
    input: ReviewSubmissionInput,
  ): Promise<SubmissionDetail> {
    const sub = await this.requireSubmission(submissionId);
    await this.requireMembership(userId, sub.workspaceId);
    const version = await this.latestVersion(sub.id);
    if (version === null) {
      throw new NotFoundException('Submission not found');
    }
    if (!REVIEWABLE.has(version.status)) {
      throw new ConflictException(`A ${version.status} submission cannot be reviewed`);
    }
    const mapped = DECISION_MAP[input.decision];
    // Pre-resolve the owner's contact email (read BEFORE the tx) for the notification seed.
    const ownerEmail =
      sub.userId === null
        ? null
        : ((
            await this.db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, sub.userId))
              .limit(1)
          )[0]?.email ?? null);
    await this.db.transaction(async (tx) => {
      const [review] = await tx
        .insert(reviews)
        .values({
          submissionVersionId: version.id,
          submissionId: sub.id,
          workspaceId: sub.workspaceId,
          reviewerId: userId,
          decision: mapped.decision,
          reason: input.reason ?? null,
        })
        .returning({ id: reviews.id });
      await tx
        .update(submissionVersions)
        .set({ status: mapped.status })
        .where(eq(submissionVersions.id, version.id));
      // Same-transaction outbox insert (doc 109's guarantee): notify the citizen owner.
      // Anonymous submissions (user_id NULL) queue nothing. Each review row is a distinct
      // decision → its own idempotency key.
      if (sub.userId !== null && review !== undefined) {
        const content = reviewNotificationContent(
          mapped.decision,
          submissionReference(sub.id, sub.createdAt),
          input.reason,
        );
        // Email deep link (feature 127): the citizen's application page, composed from config.
        const citizenWebUrl = this.config.get('CITIZEN_WEB_URL', { infer: true });
        await enqueueNotification(tx, {
          idempotencyKey: `review:${review.id}`,
          userId: sub.userId,
          type: content.type,
          title: content.title,
          body: content.body,
          payload: {
            submissionId: sub.id,
            link: new URL(`/applications/${sub.id}`, citizenWebUrl).href,
            linkLabel: 'View application',
          },
          email: ownerEmail,
        });
      }
    });
    return this.get(userId, submissionId);
  }

  private async toSummary(sub: SubmissionRow): Promise<SubmissionSummary | null> {
    const refRows = await this.db
      .select({ serviceId: documentReferences.ownerDocumentId })
      .from(documentReferences)
      .where(
        and(
          eq(documentReferences.targetVersionId, sub.documentVersionId),
          eq(documentReferences.relation, 'application_form'),
        ),
      )
      .limit(1);
    const serviceId = refRows[0]?.serviceId ?? '';
    const [svc] = serviceId
      ? await this.db
          .select({ title: documents.title })
          .from(documents)
          .where(eq(documents.id, serviceId))
          .limit(1)
      : [];
    const [form] = await this.db
      .select({ title: documents.title })
      .from(documents)
      .where(eq(documents.id, sub.documentId))
      .limit(1);
    const applicant = sub.userId
      ? (
          await this.db
            .select({ displayName: users.displayName, email: users.email })
            .from(users)
            .where(eq(users.id, sub.userId))
            .limit(1)
        )[0]
      : undefined;
    const version = await this.latestVersion(sub.id);
    const status: SubmissionStatus = version?.status ?? 'draft';
    return {
      id: sub.id,
      serviceId,
      serviceTitle: svc?.title ?? 'Service',
      formId: sub.documentId,
      formTitle: form?.title ?? 'Form',
      applicantName: applicant?.displayName ?? 'Anonymous',
      applicantEmail: applicant?.email ?? null,
      status,
      statusLabel: submissionStatusLabel(status),
      reference: submissionReference(sub.id, sub.createdAt),
      submittedAt: version?.submittedAt?.toISOString() ?? null,
      updatedAt: (version?.updatedAt ?? sub.updatedAt).toISOString(),
    };
  }

  private async reviewsFor(submissionId: string): Promise<ReviewEntry[]> {
    const rows = await this.db
      .select({
        id: reviews.id,
        decision: reviews.decision,
        reason: reviews.reason,
        createdAt: reviews.createdAt,
        reviewerName: users.displayName,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.reviewerId))
      .where(eq(reviews.submissionId, submissionId))
      .orderBy(desc(reviews.createdAt));
    return rows.map((row) => ({
      id: row.id,
      decision: row.decision,
      reason: row.reason,
      reviewerName: row.reviewerName,
      createdAt: row.createdAt.toISOString(),
    }));
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

  private async requireSubmission(submissionId: string): Promise<SubmissionRow> {
    const rows = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    const sub = rows[0];
    if (sub === undefined) {
      throw new NotFoundException('Submission not found');
    }
    return sub;
  }
}
