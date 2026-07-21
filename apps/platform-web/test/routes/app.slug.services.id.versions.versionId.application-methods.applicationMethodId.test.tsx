import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withFormEditor(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/document-types')) {
      return json({ items: [] });
    }
    if (url.includes('/v1/services/s1')) {
      return json({
        service: {
          id: 's1',
          workspaceId: 'w1',
          title: 'Permit application',
          description: '',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
        versions: [
          {
            id: 'sv1',
            documentId: 's1',
            version: 1,
            status: 'draft',
            data: { title: 'Permit application' },
            createdAt: '2026-06-01T00:00:00.000Z',
            publishedAt: null,
            archivedAt: null,
          },
        ],
        definition: {
          schema: { type: 'object', properties: {} },
          uischema: { type: 'VerticalLayout', elements: [] },
        },
        hasSubmissions: false,
      });
    }
    if (url.includes('/v1/forms/f1')) {
      return json({
        form: {
          id: 'f1',
          workspaceId: 'w1',
          title: 'Permit form',
          kind: 'basic-form',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
        version: {
          id: 'fv1',
          documentId: 'f1',
          version: 1,
          status: 'draft',
          schema: {
            schema: {
              type: 'object',
              title: 'Permit form',
              properties: {
                fullName: { type: 'string', title: 'Full Name' },
              },
            },
            uischema: {
              type: 'VerticalLayout',
              elements: [{ type: 'Control', scope: '#/properties/fullName' }],
            },
          },
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Services ID Versions VersionID Application Methods ApplicationMethodID Route', () => {
  it('renders the application method editing page correctly', async () => {
    withFormEditor(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/s1/versions/sv1/application-methods/f1');

    // Should display the sidebar with layout regions: canvas, palette, inspector
    expect(
      await screen.findByRole('region', { name: /canvas/i }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /palette/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /inspector/i })).toBeInTheDocument();

    // Check header info
    expect(screen.getByRole('heading', { level: 1, name: 'Permit form' })).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });
});
