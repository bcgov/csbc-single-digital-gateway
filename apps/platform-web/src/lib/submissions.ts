/**
 * Submissions-review API client (feature 65) — wraps `/v1/submissions`. Workspace-scoped; all calls
 * carry the session cookie. Staff list a workspace's submissions, read one, and record reviews.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { Paginated, SortOrder } from '@/lib/list-search';

export type SubmissionStatus =
  | 'draft'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_changes'
  | 'withdrawn';

export type ReviewDecision = 'approve' | 'reject' | 'request_changes';

export interface SubmissionSummary {
  id: string;
  serviceId: string;
  serviceTitle: string;
  formId: string;
  formTitle: string;
  applicantName: string;
  applicantEmail: string | null;
  status: SubmissionStatus;
  statusLabel: string;
  reference: string;
  submittedAt: string | null;
  updatedAt: string;
}

export interface ReviewEntry {
  id: string;
  decision: string;
  reason: string | null;
  reviewerName: string;
  createdAt: string;
}

export interface SubmissionDetail extends SubmissionSummary {
  kind: string;
  structure: Record<string, unknown>;
  data: Record<string, unknown>;
  reviews: ReviewEntry[];
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BFF_ORIGIN}${path}`, {
    credentials: 'include',
    ...init,
    ...(init?.body ? { headers: { 'content-type': 'application/json', ...init.headers } } : {}),
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export type SubmissionSort = 'submitted' | 'updated' | 'status';
export interface SubmissionListParams {
  status?: SubmissionStatus;
  q: string;
  sort: SubmissionSort;
  order: SortOrder;
  limit: number;
  offset: number;
}

export async function listSubmissions(
  workspaceId: string,
  params: SubmissionListParams,
): Promise<Paginated<SubmissionSummary>> {
  const search = new URLSearchParams({
    workspaceId,
    sort: params.sort,
    order: params.order,
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.status) search.set('status', params.status);
  if (params.q !== '') search.set('q', params.q);
  return requestJson<Paginated<SubmissionSummary>>(`/v1/submissions?${search}`);
}

export async function getSubmission(id: string): Promise<SubmissionDetail> {
  return requestJson(`/v1/submissions/${id}`);
}

export async function reviewSubmission(
  id: string,
  body: { decision: ReviewDecision; reason?: string },
): Promise<SubmissionDetail> {
  return requestJson(`/v1/submissions/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** The query-key root for submissions — invalidated to refresh the list + open detail page. */
export const SUBMISSIONS_KEY = ['submissions'] as const;

/** Query for a workspace's submissions — paginated, sortable, searchable, status-filterable. */
export function submissionsQueryOptions(workspaceId: string, params: SubmissionListParams) {
  return queryOptions({
    queryKey: [...SUBMISSIONS_KEY, workspaceId, params] as const,
    queryFn: () => listSubmissions(workspaceId, params),
    staleTime: 30 * 1000,
  });
}

/** Query for a single submission's detail. */
export function submissionQueryOptions(id: string) {
  return queryOptions({
    queryKey: [...SUBMISSIONS_KEY, 'detail', id] as const,
    queryFn: () => getSubmission(id),
    staleTime: 30 * 1000,
    retry: false,
  });
}
