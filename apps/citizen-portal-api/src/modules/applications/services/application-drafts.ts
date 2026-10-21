import { UnprocessableEntityException } from '@nestjs/common';
import {
  type Database,
  DOCUMENT_TYPE,
  documentLinks,
  documentVersions,
  documents,
  submissionVersions,
  submissions,
} from '@repo/database';
import { documentContentOf } from '@repo/documents/content';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { carryAnswers } from '../util/carry-answers';

type SubmissionRow = typeof submissions.$inferSelect;
type SubmissionVersionRow = typeof submissionVersions.$inferSelect;

/** The method version a draft may be started on (doc 292 rule 2). */
export interface DraftTarget {
  documentId: string;
  workspaceId: string;
  schema: Record<string, unknown>;
}

const NOT_A_FORM = 'Not an application form version';

/**
 * Doc 292 rule 2 (contract 1): `formVersionId` must be the PUBLISHED version of an application-method document in a
 * workspace that a PUBLISHED service version links to. The citizen sends the id, so nothing else is trusted.
 */
export async function draftTarget(db: Database, formVersionId: string): Promise<DraftTarget> {
  const [row] = await db
    .select({
      documentId: documentVersions.documentId,
      status: documentVersions.status,
      content: documentVersions.content,
      type: documents.type,
      kind: documents.kind,
      workspaceId: documents.workspaceId,
    })
    .from(documentVersions)
    .innerJoin(documents, eq(documents.id, documentVersions.documentId))
    .where(eq(documentVersions.id, formVersionId))
    .limit(1);
  if (
    row === undefined ||
    row.status !== 'published' ||
    row.type !== DOCUMENT_TYPE.applicationMethod ||
    row.kind !== 'document' ||
    row.workspaceId === null
  )
    throw new UnprocessableEntityException(NOT_A_FORM);
  if ((await linkedServiceVersion(db, row.documentId)) === undefined)
    throw new UnprocessableEntityException(NOT_A_FORM);
  return {
    documentId: row.documentId,
    workspaceId: row.workspaceId,
    schema: documentContentOf(row.content)?.schema ?? {},
  };
}

/**
 * Doc 292 rules 7, 9: the PUBLISHED service version that links to application method `methodId` (doc 290
 * `document_links`) — its service id and title. `undefined` when no published service uses the method.
 */
export async function linkedServiceVersion(
  db: Database,
  methodId: string,
): Promise<{ serviceId: string; title: string | null } | undefined> {
  const [row] = await db
    .select({ serviceId: documentLinks.sourceDocumentId, title: documentVersions.title })
    .from(documentLinks)
    .innerJoin(documentVersions, eq(documentVersions.id, documentLinks.sourceVersionId))
    .innerJoin(documents, eq(documents.id, documentLinks.sourceDocumentId))
    .where(
      and(
        eq(documentLinks.targetDocumentId, methodId),
        eq(documentVersions.status, 'published'),
        eq(documents.type, DOCUMENT_TYPE.service),
      ),
    )
    .limit(1);
  return row;
}

/** The citizen's draft-able submission on method `documentId`, with its latest version. */
interface UserDraft {
  submission: SubmissionRow;
  version: SubmissionVersionRow;
}

/**
 * Doc 292 rules 3-4: the citizen's NEVER-SUBMITTED draft on any version of method `documentId` — its only version is
 * v1 and still a draft. A submission that was ever submitted (or is being revised) is never resumed or moved here.
 */
export async function neverSubmittedDraft(
  db: Database,
  userId: string,
  documentId: string,
): Promise<UserDraft | undefined> {
  const subs = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.userId, userId), eq(submissions.documentId, documentId)))
    .orderBy(desc(submissions.createdAt));
  if (subs.length === 0) return undefined;
  const versions = await db
    .select()
    .from(submissionVersions)
    .where(
      inArray(
        submissionVersions.submissionId,
        subs.map((sub) => sub.id),
      ),
    );
  for (const submission of subs) {
    const own = versions.filter((version) => version.submissionId === submission.id);
    const [only] = own;
    if (own.length === 1 && only !== undefined && only.version === 1 && only.status === 'draft')
      return { submission, version: only };
  }
  return undefined;
}

/**
 * Doc 292 rule 4: move a never-submitted `draft` to `formVersionId` of the same method, keeping only the answers the
 * target schema declares. One transaction: the pin and the answers change together.
 */
export async function moveDraft(
  db: Database,
  draft: UserDraft,
  formVersionId: string,
  target: DraftTarget,
): Promise<UserDraft> {
  return db.transaction(async (tx) => {
    const [submission] = await tx
      .update(submissions)
      .set({ documentVersionId: formVersionId })
      .where(eq(submissions.id, draft.submission.id))
      .returning();
    const [version] = await tx
      .update(submissionVersions)
      .set({ data: carryAnswers(draft.version.data, target.schema) })
      .where(eq(submissionVersions.id, draft.version.id))
      .returning();
    if (submission === undefined || version === undefined)
      throw new Error('moving the draft returned no row');
    return { submission, version };
  });
}
