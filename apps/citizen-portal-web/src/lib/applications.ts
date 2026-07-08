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

/** The full view of one application — the submission + the form it was made through + its service. */
export interface ApplicationDetail {
  id: string;
  reference: string;
  status: ApplicationStatus;
  statusLabel: string;
  formId: string;
  formVersionId: string;
  formTitle: string;
  serviceId: string;
  serviceTitle: string;
  kind: string;
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

/** A request failure that carries the HTTP status (so callers can branch on e.g. a consent 422). */
export class RequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BFF_ORIGIN}${path}`, {
    credentials: 'include',
    ...init,
    ...(init?.body ? { headers: { 'content-type': 'application/json', ...init.headers } } : {}),
  });
  if (!res.ok) {
    throw new RequestError(res.status, `${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
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

/** The canonical consent decision (independent of the agreement's authored labels). */
export type ConsentDecision = 'approve' | 'reject';

/** One service agreement the citizen must decide on before applying + their current decision. */
export interface ServiceAgreementConsent {
  agreementVersionId: string;
  agreementDocumentId: string;
  /** The authored fields: title, description, content (Lexical), isOptional, approveLabel, rejectLabel. */
  data: Record<string, unknown>;
  /** The caller's latest decision on this version, or null = undecided. */
  decision: ConsentDecision | null;
}

/** The agreements a service requires + the caller's decisions (auth, `@CurrentUser`-scoped). */
export async function getServiceAgreements(serviceId: string): Promise<ServiceAgreementConsent[]> {
  const { items } = await requestJson<{ items: ServiceAgreementConsent[] }>(
    `/v1/me/services/${serviceId}/agreements`,
  );
  return items;
}

/** Record an approve/reject decision on a published agreement version (append-only; auth). */
export async function recordConsent(
  agreementVersionId: string,
  decision: ConsentDecision,
): Promise<{ agreementVersionId: string; decision: ConsentDecision }> {
  return requestJson('/v1/me/agreement-consents', {
    method: 'POST',
    body: JSON.stringify({ agreementVersionId, decision }),
  });
}

/** Query for a service's agreements + the caller's decisions (auth-gated). */
export function serviceAgreementsQueryOptions(serviceId: string, enabled: boolean) {
  return queryOptions({
    queryKey: ['me', 'serviceAgreements', serviceId] as const,
    queryFn: () => getServiceAgreements(serviceId),
    enabled,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** Query for a single application's detail. */
export function applicationQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['me', 'applications', id] as const,
    queryFn: () => getApplication(id),
    staleTime: 30 * 1000,
    retry: false,
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
