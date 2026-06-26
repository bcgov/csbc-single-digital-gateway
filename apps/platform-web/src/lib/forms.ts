/**
 * Form-documents API client (feature 42) — wraps the `/v1/forms` facade for the form builder.
 * Workspace-scoped; all calls carry the session cookie. Standalone forms persist directly here;
 * forms created through a service stay in-browser until the service composite-save (see lib/services).
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';
import type { VersionStatus } from '@/lib/services';

export type { FormDefinition } from '@/lib/services';

export interface FormDocument {
  id: string;
  workspaceId: string;
  title: string;
  kind: string;
  createdAt: string;
}

export interface FormVersion {
  id: string;
  documentId: string;
  version: number;
  status: VersionStatus;
  /** Definition blob — `{schema,uischema}` for basic-form, `{stages,edges}` for multi-stage. Cast per kind. */
  schema: Record<string, unknown>;
  createdAt: string;
}

export interface FormWithVersion {
  form: FormDocument;
  version: FormVersion;
}

const BASE = `${BFF_ORIGIN}/v1/forms`;

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function formQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['forms', 'detail', id] as const,
    queryFn: async () =>
      ok<FormWithVersion>(
        await fetch(`${BASE}/${encodeURIComponent(id)}`, { credentials: 'include' }),
      ),
    staleTime: 10_000,
  });
}

async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  return ok<T>(
    await fetch(url, {
      method,
      credentials: 'include',
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    }),
  );
}

/** Standalone create — a form document + its draft v1, persisted immediately. */
export function createForm(input: {
  workspaceId: string;
  typeId: string;
  title: string;
  definition: object;
}): Promise<FormWithVersion> {
  return send(BASE, 'POST', input);
}

/** Update a draft version's `{ schema, uischema }` (+ optional document title). */
export function updateFormSchema(
  id: string,
  versionId: string,
  input: { definition: object; title?: string },
): Promise<FormVersion> {
  return send(
    `${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`,
    'PATCH',
    input,
  );
}
