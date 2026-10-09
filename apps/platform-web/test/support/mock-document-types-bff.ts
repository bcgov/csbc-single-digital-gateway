import { vi } from 'vitest';
import { jsonResponse } from './render-app';
import { mockAuthUser } from './mock-auth-user';
import type { MockAuthOptions } from './render-app';
import { adminUser, adminWorkspace, ISO } from './fixtures';

/**
 * A version of a document type.
 */
export interface Version {
  /** The ID of the version. */
  id: string;
  //The ID of the type.
  typeId: string;
  /** The version number. */
  version: number;
  //The status of the version.
  status: 'draft' | 'published' | 'archived';
  /** The definition of the version. */
  definition: Record<string, unknown>;
  /** The creation date of the version. */
  createdAt: string;
  /** The publication date of the version. */
  publishedAt: string | null;
  /** The archival date of the version. */
  archivedAt: string | null;
}

/**
 * An entry for a document type.
 */
export interface Entry {
  type: { id: string; workspaceId: null; name: string; kind: string; createdAt: string };
  versions: Version[];
}

/**
 * Options for mockDocumentTypesBff.
 */
interface MockDocumentTypesBffOptions extends MockAuthOptions {
  /** The user to return. */
  user?: unknown | null;
  /** The test file name to match for routing. */
  testFile?: string;
}

/**
 * Mock document types BFF for testing.
 * @param documentTypes The document types to return.
 * @param options The options to return.
 * @param options.user The user to return.
 * @param options.testFile The test file name to match for routing.
 * @returns The mock document types BFF.
 */
export function mockDocumentTypesBff(
  documentTypes: { items: any[] },
  options: MockDocumentTypesBffOptions = {},
) {
  const mergedOptions = { user: adminUser, workspaces: [adminWorkspace], ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method?.toUpperCase();
    if (url.includes('/v1/admin/document-types/dt-1')) {
      if (url.endsWith('/versions')) {
        if (method === 'POST') {
          return jsonResponse(
            {
              id: 'ver-3',
              version: 3,
              status: 'draft',
              definition: { schema: { type: 'string' } },
            },
            201,
          );
        }
      }
      if (url.includes('/versions/ver-2')) {
        if (method === 'PATCH') {
          return jsonResponse({
            id: 'ver-2',
            version: 2,
            status: 'draft',
            definition: JSON.parse(init?.body as string).definition,
          });
        }
      }
      return jsonResponse(documentTypes.items[0]);
    }
    if (url.includes('/v1/admin/document-types')) {
      const rest = url.split('/v1/admin/document-types')[1]?.split('?')[0] ?? '';
      const segs = rest.split('/').filter(Boolean);
      if (segs.length === 0) {
        return jsonResponse(documentTypes);
      }
      const entry: Entry = documentTypes.items.find(
        (e) => e.type.id === decodeURIComponent(segs[0]!),
      );
      if (!entry) {
        return new Response(null, { status: 404 });
      }
      if (segs.length === 1) {
        return jsonResponse(entry);
      }
      if (segs[1] === 'versions') {
        if (segs.length === 2 && method === 'POST') {
          const body = init?.body
            ? (JSON.parse(String(init.body)) as { definition: Record<string, unknown> })
            : { definition: {} };
          const nextVerNum = entry.versions.length + 1;
          const newVersion: Version = {
            id: `${entry.type.id}-v${nextVerNum}`,
            typeId: entry.type.id,
            version: nextVerNum,
            status: 'draft',
            definition: body.definition,
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          };
          entry.versions.push(newVersion);
          return jsonResponse(newVersion);
        }
        if (segs.length === 3) {
          const versionId = decodeURIComponent(segs[2]!);
          const version = entry.versions.find((v) => v.id === versionId);
          if (!version) {
            return new Response(null, { status: 404 });
          }
          if (method === 'PATCH') {
            const body = init?.body
              ? (JSON.parse(String(init.body)) as { definition: Record<string, unknown> })
              : { definition: {} };
            version.definition = body.definition;
            return jsonResponse(version);
          }
        }
        if (segs.length === 4) {
          const versionId = decodeURIComponent(segs[2]!);
          const version = entry.versions.find((v) => v.id === versionId);
          if (!version) {
            return new Response(null, { status: 404 });
          }
          if (segs[3] === 'publish' && method === 'POST') {
            for (const v of entry.versions) {
              if (v.status === 'published') {
                v.status = 'archived';
                v.archivedAt = ISO;
              }
            }
            version.status = 'published';
            version.publishedAt = ISO;
            return jsonResponse(version);
          }
        }
      }
      return jsonResponse(documentTypes);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
