/**
 * Form-documents API client (features 42–45) — wraps the `/v1/forms` facade. Application-method forms
 * are created server-side through the service references endpoint (see `createReferencedForm` in
 * lib/services); here we only READ a form and UPDATE its draft definition from the in-service builder.
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

/** Update a draft version's definition (+ optional document title). */
export async function updateFormSchema(
  id: string,
  versionId: string,
  input: { definition: object; title?: string },
): Promise<FormVersion> {
  return ok<FormVersion>(
    await fetch(`${BASE}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
}
