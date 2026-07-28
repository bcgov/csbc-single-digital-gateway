/**
 * Browser client + query options for the citizen service-agreement history (feature 139). Reads the
 * private `/v1/me/service-agreements` endpoints (session-credentialed); the timeline groups the flat
 * descending list by month/day in the browser (locale + timezone live here).
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

/** One approved agreement in the citizen's history (list item). */
export interface ServiceAgreementListItem {
  /** The consent row id — the detail route param. */
  id: string;
  agreementDocumentId: string;
  title: string;
  /** ISO 8601 timestamp of when the citizen approved. */
  consentedAt: string;
}

/** The full content of one approved agreement (detail). */
export interface ServiceAgreementDetail {
  id: string;
  agreementDocumentId: string;
  title: string;
  description: string | null;
  /** Staff-authored Lexical content, rendered read-only via `@repo/ui/rich-text-view`. */
  content: unknown;
  consentedAt: string;
}

/** A non-2xx from the BFF, carrying the status so callers can branch (e.g. 404 → not found). */
export class RequestError extends Error {
  constructor(readonly status: number) {
    super(`Request failed: ${status}`);
    this.name = 'RequestError';
  }
}

async function requestJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BFF_ORIGIN}${path}`, { credentials: 'include' });
  if (!res.ok) {
    throw new RequestError(res.status);
  }
  return (await res.json()) as T;
}

/** All of the caller's approvals, newest first. */
export async function getServiceAgreements(): Promise<ServiceAgreementListItem[]> {
  const { items } = await requestJson<{ items: ServiceAgreementListItem[] }>(
    '/v1/me/service-agreements',
  );
  return items;
}

/** One approval (by consent id), scoped to the caller. */
export async function getServiceAgreement(id: string): Promise<ServiceAgreementDetail> {
  return requestJson(`/v1/me/service-agreements/${id}`);
}

export const SERVICE_AGREEMENTS_KEY = ['me', 'serviceAgreements'] as const;

/** The timeline list query. */
export function serviceAgreementsQueryOptions() {
  return queryOptions({
    queryKey: SERVICE_AGREEMENTS_KEY,
    queryFn: getServiceAgreements,
  });
}

/** One agreement's detail query. */
export function serviceAgreementQueryOptions(id: string) {
  return queryOptions({
    queryKey: [...SERVICE_AGREEMENTS_KEY, id] as const,
    queryFn: () => getServiceAgreement(id),
  });
}
