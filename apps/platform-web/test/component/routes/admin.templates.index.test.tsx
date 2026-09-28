import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { Route } from '@/routes/admin.templates.index';

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

function mockTemplates(items: any[], base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/admin/templates')) {
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

  it('renders empty state when no templates exist', async () => {
    mockTemplates([], mockAuth(adminUser));
    renderApp('/admin/templates');

    expect(await screen.findByText('No templates yet.', {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it('renders a list of templates with correct statuses and links', async () => {
    const mockData = [
      // Feature 217: the row's NAME is the latest version's GENERATED title, and the badge is the
      // template's `type` rather than a text kind.
      {
        template: { id: 'dt-1', type: 'services.service-application-method' },
        versions: [
          { id: 'v1', versionNumber: 1, status: 'published' as const, title: 'Document A' },
          { id: 'v2', versionNumber: 2, status: 'draft' as const, title: 'Document A' },
        ],
      },
      {
        template: { id: 'dt-2', type: 'services.service' },
        versions: [{ id: 'v3', versionNumber: 1, status: 'draft' as const, title: 'Document B' }],
      },
      {
        template: { id: 'dt-3', type: 'services.service-agreement' },
        versions: [
          { id: 'v4', versionNumber: 1, status: 'archived' as const, title: 'Document C' },
        ],
      },
    ];

    mockTemplates(mockData, mockAuth(adminUser));
    renderApp('/admin/templates');

    expect(await screen.findByText('Document A', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document A' })).toHaveAttribute(
      'href',
      '/admin/templates/dt-1',
    );
    expect(screen.getByText('Published v1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    expect(screen.getByText('Document B')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document B' })).toHaveAttribute(
      'href',
      '/admin/templates/dt-2',
    );

    expect(screen.getByText('Document C')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document C' })).toHaveAttribute(
      'href',
      '/admin/templates/dt-3',
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();

    expect(screen.getByText('Application method')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Service agreement')).toBeInTheDocument();
  });

  it('renders Archived status and 0 version count when versions list is empty', async () => {
    const mockData = [
      {
        template: { id: 'dt-4', type: 'services.service-application-method' },
        versions: [],
      },
    ];

    mockTemplates(mockData, mockAuth(adminUser));
    renderApp('/admin/templates');

    expect(
      await screen.findByRole('link', { name: 'Untitled' }, { timeout: 8000 }),
    ).toHaveAttribute('href', '/admin/templates/dt-4');
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
