import { screen } from '@testing-library/react';
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
          items: [],
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
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', title: 'Title' },
            },
          },
          uischema: {
            type: 'VerticalLayout',
            elements: [{ type: 'Control', scope: '#/properties/title' }],
          },
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

describe('App Slug Services ID Versions VersionID Index Route', () => {
  it('renders the service detail page selected on the service details tab for specific version', async () => {
    withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/s1/versions/sv1/');

    // Breadcrumb page title
    expect(
      await screen.findByRole('link', { name: 'Permit application' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify service details tab is active
    const detailsTab = screen.getByRole('tab', { name: /Service details/i });
    expect(detailsTab).toHaveAttribute('data-active');

    // Title field
    const titleInput = await screen.findByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('Permit application');

    // Action buttons
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish service/i })).toBeInTheDocument();
  });
});
