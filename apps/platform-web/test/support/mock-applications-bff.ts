import type { MockAuthOptions } from './render-app';
import { authedUser, jsonResponse } from './render-app';
import { adminWorkspace, ISO } from './fixtures';
import { mockAuthUser } from './mock-auth-user';
import { vi } from 'vitest';

interface MockApplicationsBffOptions extends MockAuthOptions {
  /** The user to return. */
  user?: unknown | null;
  /** The test file name to match for routing. */
  testFile?: string;
  workspace?: object;
  service?: object;
  mockFormTypes?: object;
  mockBasicReference?: object;
  mockMultistageReference?: object;
  onSaveForm?: (body: any) => void;
  onCreateForm?: (body: any) => void;
  onCreateExternal?: (body: any) => void;
}

export function mockApplicationsBff(form: any, options: MockApplicationsBffOptions = {}) {
  const mergedOptions = { user: authedUser, workspaces: [adminWorkspace], ...options };
  const base = mockAuthUser(mergedOptions.user, mergedOptions);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (mergedOptions.testFile === 'application-method-modal.test') {
      if (url.includes('/v1/workspaces')) {
        return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
      }
      if (url.includes('/v1/document-types')) {
        return jsonResponse(mergedOptions.mockFormTypes);
      }
      if (url.includes('/v1/services/srv-123/versions/v-456/forms') && method === 'POST') {
        const body = JSON.parse(String(init?.body));
        if (mergedOptions.onCreateForm) {
          mergedOptions.onCreateForm(body);
        }
        if (body.typeId === 'type-basic') {
          return jsonResponse(mergedOptions.mockBasicReference);
        }
        return jsonResponse(mergedOptions.mockMultistageReference);
      }
      if (
        url.includes('/v1/services/srv-123/versions/v-456/external-applications') &&
        method === 'POST'
      ) {
        const body = JSON.parse(String(init?.body));
        if (mergedOptions.onCreateExternal) {
          mergedOptions.onCreateExternal(body);
        }
        return jsonResponse({
          id: 'ref-external-123',
          relation: 'external_application',
          position: 0,
          label: body.label,
          targetDocumentId: 'doc-external-789',
          targetVersionId: 'v-external-1',
          targetKind: 'external-link',
          targetTitle: body.label,
          targetVersion: 1,
          targetStatus: 'draft',
          hasSubmissions: false,
        });
      }
    }

    if (mergedOptions.testFile === 'application-method-edit-page.test') {
      if (url.includes('/v1/workspaces')) {
        return jsonResponse({ items: [mergedOptions.workspace], total: 1, limit: 100, offset: 0 });
      }
      if (url.includes('/v1/services/srv-123')) {
        return jsonResponse(mergedOptions.service);
      }
      if (url.includes('/v1/forms/am-789/versions/v-1') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body));
        if (mergedOptions.onSaveForm) {
          mergedOptions.onSaveForm(body);
        }
        return jsonResponse({
          id: 'v-1',
          documentId: 'am-789',
          version: 1,
          status: form.version.status,
          schema: body.definition,
          createdAt: ISO,
        });
      }
      if (url.includes('/v1/forms/am-789')) {
        return jsonResponse(form);
      }
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}
