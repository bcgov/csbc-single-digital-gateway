/**
 * Browser client + query options for the citizen application flow (feature 63, doc 292). Talks to the
 * citizen-portal-api's private `/v1/me/applications` lifecycle; the form to fill comes from the catalog's published
 * application method (doc 291).
 * Mutations are credentialed cross-origin calls (the browser sends Origin → CSRF-allowlisted).
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { ApplicationStatus } from '@/lib/catalog';

/** One of the citizen's applications in full (`GET /v1/me/applications/:id`) — the answers and the form they fill. */
export interface ApplicationDetail {
  id: string;
  reference: string;
  status: ApplicationStatus;
  statusLabel: string;
  formId: string;
  formVersionId: string;
  /** The method version's generated title; null when its content has no root label. */
  formTitle: string | null;
  /** The form the answers were made on: `{ schema, variants }` (doc 275). */
  structure: Record<string, unknown>;
  data: Record<string, unknown>;
  /** The latest reviewer note, surfaced in the status banner for rejected / action-needed. */
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

/** A submission in the draft → submitted lifecycle. */
export interface Submission {
  id: string;
  formId: string;
  formVersionId: string;
  status: ApplicationStatus;
  data: Record<string, unknown>;
  reference: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

/** A request failure that carries the HTTP status and, for a 422, the API's validation messages (doc 292 rule 6). */
export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: readonly string[] = [],
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

/** The API's own message and validation errors, when the body carries them. */
async function failure(res: Response, fallback: string): Promise<RequestError> {
  let message = fallback;
  let errors: string[] = [];
  try {
    const body = (await res.json()) as { message?: unknown; errors?: unknown };
    if (typeof body.message === 'string') message = body.message;
    if (Array.isArray(body.errors))
      errors = body.errors.filter((e): e is string => typeof e === 'string');
  } catch {
    // Not JSON — keep the status line.
  }
  return new RequestError(res.status, message, errors);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BFF_ORIGIN}${path}`, {
    credentials: 'include',
    ...init,
    ...(init?.body ? { headers: { 'content-type': 'application/json', ...init.headers } } : {}),
  });
  if (!res.ok) {
    throw await failure(res, `${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Start a new application for a form version, or resume the existing draft (auth). */
export async function createOrResumeDraft(formVersionId: string): Promise<Submission> {
  return requestJson('/v1/me/applications', {
    method: 'POST',
    body: JSON.stringify({ formVersionId }),
  });
}

/** Save in-progress answers on a draft (auth). */
export async function saveDraft(id: string, data: Record<string, unknown>): Promise<Submission> {
  return requestJson(`/v1/me/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  });
}

/** Submit the application: persist final answers and advance draft → pending (auth). */
export async function submitApplication(
  id: string,
  data: Record<string, unknown>,
): Promise<Submission> {
  return requestJson(`/v1/me/applications/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

/** One of the citizen's applications, fully resolved for the application page (auth). */
export async function getApplication(id: string): Promise<ApplicationDetail> {
  return requestJson(`/v1/me/applications/${id}`);
}

/**
 * Open a draft revision of an application a reviewer sent back (`needs_changes`). Returns the new
 * draft submission; the existing saveDraft/submit then apply to it. 409 if it isn't awaiting changes.
 */
export async function reviseApplication(id: string): Promise<Submission> {
  return requestJson(`/v1/me/applications/${id}/revise`, { method: 'POST' });
}

/** The query-key root for a citizen's applications — invalidated to refresh the detail page. */
export const APPLICATIONS_KEY = ['me', 'applications'] as const;

/** Query for a single application's detail. */
export function applicationQueryOptions(id: string) {
  return queryOptions({
    queryKey: [...APPLICATIONS_KEY, id] as const,
    queryFn: () => getApplication(id),
    staleTime: 30 * 1000,
    retry: false,
  });
}

/**
 * Query that get-or-creates the citizen's draft for a form version. Idempotent (it resumes an
 * existing draft), so caching it is safe; we avoid refetch-on-focus to not POST repeatedly.
 */
export function draftQueryOptions(formVersionId: string | undefined) {
  return queryOptions({
    queryKey: ['applicationDraft', formVersionId] as const,
    queryFn: () => createOrResumeDraft(formVersionId as string),
    enabled: Boolean(formVersionId),
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
