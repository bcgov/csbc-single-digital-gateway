/**
 * Application methods API client (doc 287) — wraps `/v1/forms`. An application method is a `services.service-application-method`
 * document; staff create one from a template, author its draft (doc 288) and may delete it. All calls carry the session
 * cookie.
 */
import { queryOptions } from '@tanstack/react-query';
import { BFF_ORIGIN } from '@/lib/bff';

export interface Form {
  id: string;
  workspaceId: string;
  /** From the version's GENERATED title — null when its content carries no root label. */
  title: string | null;
  type: 'services.service-application-method';
  createdAt: string;
}

/** One version of an application method (`FormVersionDto`). */
export interface FormVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  revision: number;
  status: 'draft' | 'published' | 'archived';
  title: string | null;
  description: string | null;
  content: Record<string, unknown>;
  createdAt: string;
}

/** `GET /v1/forms/:id`: the method, its LATEST version, and the template that version is pinned to (doc 221). */
export interface FormWithVersion {
  form: Form;
  version: FormVersion;
  definition?: {
    schema: Record<string, unknown>;
    variants: Record<string, Record<string, unknown>>;
    capabilities?: Record<string, unknown>;
  };
}

const BASE = `${BFF_ORIGIN}/v1/forms`;

async function errorFrom(res: Response): Promise<Error> {
  let message = `Request failed: ${res.status}`;
  try {
    const body = (await res.json()) as { message?: unknown };
    if (typeof body.message === 'string') {
      message = body.message;
    } else if (Array.isArray(body.message)) {
      message = body.message.join(', ');
    }
  } catch {
    /* non-JSON error body */
  }
  return new Error(message);
}

/** Create an application method in `workspaceId` from the published template `templateId`. */
export async function createForm(input: {
  workspaceId: string;
  title: string;
  templateId: string;
}): Promise<{ form: Form }> {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<{ form: Form }>;
}

/** Delete an application method — refused (409) once it has submissions. */
export async function deleteForm(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw await errorFrom(res);
}

async function ok<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<T>;
}

/** Doc 288: an application method with its latest version. */
export function formQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['forms', 'detail', id] as const,
    queryFn: async () =>
      ok<FormWithVersion>(
        await fetch(`${BASE}/${encodeURIComponent(id)}`, { credentials: 'include' }),
      ),
  });
}

/** Doc 288: save a draft version's content — refused (409) unless a draft, (403) outside its template's rules. */
export async function updateFormDraft(
  id: string,
  versionId: string,
  input: { content: Record<string, unknown> },
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
