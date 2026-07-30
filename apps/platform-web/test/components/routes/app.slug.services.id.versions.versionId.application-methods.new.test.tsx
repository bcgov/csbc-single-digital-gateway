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

const mockFormTypes = {
  items: [
    {
      type: {
        id: 'type-basic',
        name: 'Basic Form',
        kind: 'basic-form',
      },
    },
    {
      type: {
        id: 'type-multistage',
        name: 'Multi-stage Form',
        kind: 'multi-stage-form',
      },
    },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withServicesAndDocumentTypes(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/document-types')) {
      return json(mockFormTypes);
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

describe('App Slug Services ID Versions VersionID Application Methods New Route', () => {
  it('renders the services detail page with the new application method modal open', async () => {
    withServicesAndDocumentTypes(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/s1/versions/sv1/application-methods/new');

    // Breadcrumb page title (will be aria-hidden/inert when dialog is open)
    expect(
      await screen.findByRole(
        'link',
        { name: 'Permit application', hidden: true },
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();

    // Verify modal is open and has the heading "New application method"
    expect(
      await screen.findByRole('heading', { name: 'New application method' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Check modal description and fields
    expect(screen.getByText('Choose how applicants apply for this service.')).toBeInTheDocument();

    // Verify option choices are visible
    expect(await screen.findByText(/Basic form/i)).toBeInTheDocument();
    expect(await screen.findByText(/Multi-stage form/i)).toBeInTheDocument();
  });
});
