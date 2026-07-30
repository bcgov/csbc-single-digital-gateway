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
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import {
  type ListSubmissionsQuery,
  type ReviewEntry,
  type ReviewSubmissionInput,
  type SubmissionDetail,
  type SubmissionListResponse,
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

  /**
   * The workspace review queue — paginated, sortable, searchable (initiative `staff-list-query`).
   * Everything (join to the latest submission version, applicant, service, the draft exclusion, the
   * status tab, search, sort, paging) runs in ONE SQL query (+ a count), replacing the previous
   * fetch-all + per-row `toSummary` N+1. Drafts are always excluded (feature 151); `?status=draft`
   * therefore yields nothing.
   */
  async list(userId: string, query: ListSubmissionsQuery): Promise<SubmissionListResponse> {
    await this.requireMembership(userId, query.workspaceId);
    // Join the submission's LATEST version (max version per submission; the pair is unique).
    const latestVersion = sql`(select max(sv2.version) from submission_versions sv2 where sv2.submission_id = ${submissions.id})`;
    // The single service that references this submission's form version as an application method.
    const serviceIdExpr = sql<
      string | null
    >`(select dr.owner_document_id from ${documentReferences} dr where dr.target_version_id = ${submissions.documentVersionId} and dr.relation = 'application_form' limit 1)`;
    const serviceTitleExpr = sql<
      string | null
    >`(select d2.title from ${documentReferences} dr join ${documents} d2 on d2.id = dr.owner_document_id where dr.target_version_id = ${submissions.documentVersionId} and dr.relation = 'application_form' limit 1)`;
    // The human reference (matches `submissionReference`): UTC YYYYMMDD + last-4 id hex, upper.
    const referenceExpr = sql`(to_char(${submissions.createdAt} at time zone 'UTC', 'YYYYMMDD') || '-' || upper(right(replace(${submissions.id}::text, '-', ''), 4)))`;

    const conditions = [
      eq(submissions.workspaceId, query.workspaceId),
      // Staff never see un-submitted drafts (feature 151); the status is the latest version's.
      sql`${submissionVersions.status} <> 'draft'`,
    ];
    if (query.status !== undefined) {
      conditions.push(eq(submissionVersions.status, query.status));
    }
    const q = query.q?.trim();
    if (q !== undefined && q !== '') {
      const pattern = `%${q}%`;
      const search = or(
        ilike(users.displayName, pattern),
        sql`${serviceTitleExpr} ilike ${pattern}`,
        sql`${referenceExpr} ilike ${pattern}`,
      );
      if (search) {
        conditions.push(search);
      }
    }
    const where = and(...conditions);
    const latestJoin = and(
      eq(submissionVersions.submissionId, submissions.id),
      eq(submissionVersions.version, latestVersion),
    );
    const sortExpr =
      query.sort === 'updated'
        ? submissionVersions.updatedAt
        : query.sort === 'status'
          ? submissionVersions.status
          : submissionVersions.submittedAt;
    const direction = query.order === 'asc' ? asc : desc;
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          sub: submissions,
          status: submissionVersions.status,
          submittedAt: submissionVersions.submittedAt,
          versionUpdatedAt: submissionVersions.updatedAt,
          serviceId: serviceIdExpr,
          serviceTitle: serviceTitleExpr,
          formTitle: documents.title,
          applicantName: users.displayName,
          applicantEmail: users.email,
        })
        .from(submissions)
        .innerJoin(submissionVersions, latestJoin)
        .leftJoin(users, eq(users.id, submissions.userId))
        .leftJoin(documents, eq(documents.id, submissions.documentId))
        .where(where)
        .orderBy(direction(sortExpr), desc(submissions.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(submissions)
        .innerJoin(submissionVersions, latestJoin)
        .leftJoin(users, eq(users.id, submissions.userId))
        .where(where),
    ]);
    const items = rows.map((row) => ({
      id: row.sub.id,
      serviceId: row.serviceId ?? '',
      serviceTitle: row.serviceTitle ?? 'Service',
      formId: row.sub.documentId,
      formTitle: row.formTitle ?? 'Form',
      applicantName: row.applicantName ?? 'Anonymous',
      applicantEmail: row.applicantEmail ?? null,
      status: row.status,
      statusLabel: submissionStatusLabel(row.status),
      reference: submissionReference(row.sub.id, row.sub.createdAt),
      submittedAt: row.submittedAt?.toISOString() ?? null,
      updatedAt: (row.versionUpdatedAt ?? row.sub.updatedAt).toISOString(),
    }));
    return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
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
