import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../../support/render-app';

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

function withServices(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/document-types')) {
      return json({ items: [] });
    }
    if (url.includes('/v1/services/s1')) {
      if (url.endsWith('/references')) {
        return json({
          items: [
            {
              id: 'ref1',
              relation: 'application_form',
              position: 0,
              label: 'Apply now',
              targetDocumentId: 'f1',
              targetVersionId: 'fv1',
              targetKind: 'basic-form',
              targetTitle: 'Permit form',
              targetVersion: 1,
              targetStatus: 'draft',
              hasSubmissions: false,
              hasStructure: true,
              createdAt: '2026-06-01T00:00:00.000Z',
            },
          ],
        });
      }
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
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('App Slug Services ID Versions VersionID Application Methods Index Route', () => {
  it('renders the services detail page selected on the application methods tab for specific version', async () => {
    withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/s1/versions/sv1/application-methods/');

    // Breadcrumb page title
    expect(
      await screen.findByRole('link', { name: 'Permit application' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify application methods tab is active and shows the count badge of 1
    const methodsTab = screen.getByRole('tab', { name: /Application methods/i });
    expect(methodsTab).toHaveAttribute('data-active');

    await waitFor(() => {
      expect(methodsTab).toHaveTextContent('1');
    });

    // Check list of application methods inside the tab
    expect(screen.getByText('Permit form')).toBeInTheDocument();
    expect(screen.getByText(/Apply now/i)).toBeInTheDocument();
  });
});
