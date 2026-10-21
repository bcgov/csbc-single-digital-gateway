import {
  type Database,
  documentVersions,
  documents,
  submissions,
  DOCUMENT_TYPE,
} from '@repo/database';
import { type SQL, and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import {
  type ListServicesPageQuery,
  type ServiceListResponse,
  type ServiceSummary,
  toServiceDto,
} from '../dtos/service.dtos';

/** The derived list status: published if any version is, else draft if any is, else archived, else none. */
export function summarizeStatus(
  versions: Array<{ status: 'draft' | 'published' | 'archived' }>,
): ServiceSummary['status'] {
  if (versions.some((v) => v.status === 'published')) return 'published';
  if (versions.some((v) => v.status === 'draft')) return 'draft';
  if (versions.length > 0) return 'archived';
  return 'none';
}

/**
 * The version a service is currently represented by: the published one if there is one, else the
 * newest. `versions` must be ordered oldest-first.
 */
export function currentVersion<T extends { publishedAt: Date | null }>(
  versions: T[],
): T | undefined {
  return versions.findLast((version) => version.publishedAt !== null) ?? versions.at(-1);
}

// The latest version's generated title/description — the row's current identity (feature 217).
const latestTitle = sql<string>`(SELECT dv.title FROM ${documentVersions} dv
  WHERE dv.document_id = ${documents.id} ORDER BY dv.version_number DESC LIMIT 1)`;
const latestDescription = sql<string>`(SELECT dv.description FROM ${documentVersions} dv
  WHERE dv.document_id = ${documents.id} ORDER BY dv.version_number DESC LIMIT 1)`;
// Derived status precedence for `sort: 'status'` — published(0) → draft(1) → archived(2) → none(3).
const statusRank = sql`(CASE
  WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id} AND dv.status = 'published') THEN 0
  WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id} AND dv.status = 'draft') THEN 1
  WHEN EXISTS (SELECT 1 FROM ${documentVersions} dv WHERE dv.document_id = ${documents.id}) THEN 2
  ELSE 3 END)`;

/** The workspace's service documents matching `q` against the latest version's title/description. */
function listFilter(query: ListServicesPageQuery): SQL | undefined {
  const q = query.q?.trim();
  const search =
    q !== undefined && q !== ''
      ? or(ilike(latestTitle, `%${q}%`), ilike(latestDescription, `%${q}%`))
      : undefined;
  return and(
    eq(documents.workspaceId, query.workspaceId),
    eq(documents.type, DOCUMENT_TYPE.service),
    eq(documents.kind, 'document'),
    search,
  );
}

function sortExpression(query: ListServicesPageQuery) {
  if (query.sort === 'title') return latestTitle;
  if (query.sort === 'status') return statusRank;
  return documents.updatedAt;
}

/** What the list reads of each version. */
interface VersionRow {
  documentId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  title: string | null;
  description: string | null;
  publishedAt: Date | null;
}

/** The page's versions (oldest first) and which of its documents have submissions — two batched queries. */
async function pageDetails(
  db: Database,
  docIds: string[],
): Promise<{ versionsByDoc: Map<string, VersionRow[]>; submissionDocIds: Set<string> }> {
  if (docIds.length === 0) return { versionsByDoc: new Map(), submissionDocIds: new Set() };
  const [versionRows, submissionRows] = await Promise.all([
    db
      .select({
        documentId: documentVersions.documentId,
        versionNumber: documentVersions.versionNumber,
        status: documentVersions.status,
        title: documentVersions.title,
        description: documentVersions.description,
        publishedAt: documentVersions.publishedAt,
      })
      .from(documentVersions)
      .where(inArray(documentVersions.documentId, docIds))
      .orderBy(asc(documentVersions.versionNumber)),
    db
      .select({ documentId: submissions.documentId, n: sql<number>`count(*)::int` })
      .from(submissions)
      .where(inArray(submissions.documentId, docIds))
      .groupBy(submissions.documentId),
  ]);
  const versionsByDoc = new Map<string, VersionRow[]>();
  for (const row of versionRows) {
    const list = versionsByDoc.get(row.documentId);
    if (list) list.push(row);
    else versionsByDoc.set(row.documentId, [row]);
  }
  return { versionsByDoc, submissionDocIds: new Set(submissionRows.map((row) => row.documentId)) };
}

/**
 * A workspace's services — paginated, sortable, searchable (initiative `staff-list-query`). Paging/sort/search run in
 * SQL; the page's derived fields (status, version count, submissions) come from two batched follow-up queries (not
 * per-row), so cost is bounded by the page size. The caller checks membership first.
 *
 * Feature 217: `title` / `description` live on the VERSION and are generated, so search and title-sort go through a
 * correlated subquery over the latest version rather than a column on `documents`.
 */
export async function listServicesPage(
  db: Database,
  query: ListServicesPageQuery,
): Promise<ServiceListResponse> {
  const where = listFilter(query);
  const direction = query.order === 'asc' ? asc : desc;
  const [docs, totals] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(where)
      .orderBy(direction(sortExpression(query)), desc(documents.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(where),
  ]);
  const { versionsByDoc, submissionDocIds } = await pageDetails(
    db,
    docs.map((doc) => doc.id),
  );
  const items = docs.map((doc) => {
    const versions = versionsByDoc.get(doc.id) ?? [];
    // versions are ordered asc by version_number, so the last row is the latest version.
    const latest = versions.at(-1);
    // Object.assign onto the fresh DTO (not a spread) keeps oxlint's no-map-spread happy.
    return Object.assign(toServiceDto(doc, currentVersion(versions)), {
      status: summarizeStatus(versions),
      versionCount: versions.length,
      hasSubmissions: submissionDocIds.has(doc.id),
      latestPublished: latest?.publishedAt != null,
    });
  });
  return { items, total: totals[0]?.count ?? 0, limit: query.limit, offset: query.offset };
}
