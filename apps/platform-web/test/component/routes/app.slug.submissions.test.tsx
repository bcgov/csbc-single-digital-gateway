import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, jsonResponse, mockAuth, renderApp } from '../../support/render-app';
import { adminWorkspace } from '../../support/fixtures';

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

function withEmptySubmissions(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/submissions')) {
      return jsonResponse({
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

describe('App Slug Submissions Layout Route', () => {
  it('renders the child route inside the Outlet for app slug submissions layout route', async () => {
    withEmptySubmissions(mockAuth(authedUser, { workspaces: [adminWorkspace] }));
    renderApp('/app/riverton/submissions/');

    // Verify child submissions queue index page content renders through the Outlet
    expect(await screen.findByRole('tab', { name: 'All' }, { timeout: 32000 })).toBeInTheDocument();
  });
});
