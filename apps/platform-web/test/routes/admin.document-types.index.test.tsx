import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../support/render-app';
import { Route } from '@/routes/admin.document-types.index';

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

const adminUser = { ...authedUser, roles: ['admin'] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockDocumentTypes(items: any[], base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/admin/document-types')) {
      return json({ items });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Admin Document Types Index Route Integration Test Suite', () => {
  it('verifies route has a valid component definition', () => {
    expect(Route.options.component).toBeDefined();
  });

  it('renders empty state when no document types exist', async () => {
    mockDocumentTypes([], mockAuth(adminUser));
    renderApp('/admin/document-types');

    expect(await screen.findByText('No document types yet.')).toBeInTheDocument();
  });

  it('renders a list of document types with correct statuses and links', async () => {
    const mockData = [
      {
        type: { id: 'dt-1', name: 'Document A', kind: 'basic-form' },
        versions: [
          { id: 'v1', version: 1, status: 'published' as const },
          { id: 'v2', version: 2, status: 'draft' as const },
        ],
      },
      {
        type: { id: 'dt-2', name: 'Document B', kind: 'multi-stage-form' },
        versions: [{ id: 'v3', version: 1, status: 'draft' as const }],
      },
      {
        type: { id: 'dt-3', name: 'Document C', kind: 'some-other-kind' },
        versions: [{ id: 'v4', version: 1, status: 'archived' as const }],
      },
    ];

    mockDocumentTypes(mockData, mockAuth(adminUser));
    renderApp('/admin/document-types');

    expect(await screen.findByText('Document A')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document A' })).toHaveAttribute(
      'href',
      '/admin/document-types/dt-1',
    );
    expect(screen.getByText('Published v1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    expect(screen.getByText('Document B')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document B' })).toHaveAttribute(
      'href',
      '/admin/document-types/dt-2',
    );

    expect(screen.getByText('Document C')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document C' })).toHaveAttribute(
      'href',
      '/admin/document-types/dt-3',
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();

    const badges = screen.getAllByText('basic-form');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders Archived status and 0 version count when versions list is empty', async () => {
    const mockData = [
      {
        type: { id: 'dt-4', name: 'Document D', kind: 'basic-form' },
        versions: [],
      },
    ];

    mockDocumentTypes(mockData, mockAuth(adminUser));
    renderApp('/admin/document-types');

    expect(await screen.findByRole('link', { name: 'Document D' })).toHaveAttribute(
      'href',
      '/admin/document-types/dt-4',
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
