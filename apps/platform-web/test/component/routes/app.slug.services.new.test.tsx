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

function withEmptyServices(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/services')) {
      return json({
        items: [],
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

describe('App Slug Services New Route', () => {
  it('renders the services list page with the new service modal open', async () => {
    withEmptyServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/new');

    // Verify modal is open and has the heading "New service"
    expect(
      await screen.findByRole('heading', { name: 'New service' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Check modal description and input labels
    expect(
      screen.getByText(
        'Give the service a title and description — you can configure the rest after it’s created.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();

    // Check action buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create service' })).toBeInTheDocument();
  });
});
