/**
 * Browser client + query options for the citizen application flow (feature 63). Talks to the
 * citizen-portal-api: the public form-to-fill read and the private `/v1/me/applications` lifecycle.
 * Mutations are credentialed cross-origin calls (the browser sends Origin → CSRF-allowlisted).
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { ApplicationStatus } from '@/lib/catalog';

/** The form to render for an application: its kind + structure (`{schema,uischema}` or `{stages,…}`). */
export interface ApplicationFormToFill {
  serviceId: string;
  formId: string;
  formVersionId: string;
  kind: string;
  title: string;
  structure: Record<string, unknown>;
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

/** The form a citizen fills to apply for a service (public). */
export async function getApplicationForm(
  serviceId: string,
  formId: string,
): Promise<ApplicationFormToFill> {
  return requestJson(`/v1/services/${serviceId}/applications/${formId}`);
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

/** Query for the form to fill. */
export function applicationFormQueryOptions(serviceId: string, formId: string) {
  return queryOptions({
    queryKey: ['applicationForm', serviceId, formId] as const,
    queryFn: () => getApplicationForm(serviceId, formId),
    staleTime: 60 * 1000,
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
