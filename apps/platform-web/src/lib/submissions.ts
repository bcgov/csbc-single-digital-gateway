/**
 * Submissions-review API client (feature 65) — wraps `/v1/submissions`. Workspace-scoped; all calls
 * carry the session cookie. Staff list a workspace's submissions, read one, and record reviews.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

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

export async function listSubmissions(
  workspaceId: string,
  status?: SubmissionStatus,
): Promise<SubmissionSummary[]> {
  const params = new URLSearchParams({ workspaceId });
  if (status) {
    params.set('status', status);
  }
  const data = await requestJson<{ items: SubmissionSummary[] }>(`/v1/submissions?${params}`);
  return data.items;
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

/** Query for a workspace's submissions, optionally filtered by status. */
export function submissionsQueryOptions(workspaceId: string, status?: SubmissionStatus) {
  return queryOptions({
    queryKey: ['submissions', workspaceId, status ?? 'all'] as const,
    queryFn: () => listSubmissions(workspaceId, status),
    staleTime: 30 * 1000,
  });
}

/** Query for a single submission's detail. */
export function submissionQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['submissions', 'detail', id] as const,
    queryFn: () => getSubmission(id),
    staleTime: 30 * 1000,
    retry: false,
  });
}
