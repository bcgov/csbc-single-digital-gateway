import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-07-07T00:00:00.000Z';
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const workspaceAgreement = {
  id: 'a1',
  workspaceId: 'w1',
  title: 'Terms of service',
  kind: 'service-agreement',
  createdAt: ISO,
  updatedAt: ISO,
  status: 'draft',
  isGlobal: false,
};

const globalAgreement = {
  id: 'g1',
  workspaceId: null,
  title: 'Privacy policy',
  kind: 'service-agreement',
  createdAt: ISO,
  updatedAt: ISO,
  status: 'published',
  isGlobal: true,
};

/** Wrap the shared auth/workspace mock with the /v1/service-agreements list endpoint. */
function withAgreements(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    // Paginated browse (the console + admin lists). Globals are excluded server-side from the
    // workspace scope (feature 150); the admin scope (no workspaceId) is global-only.
    if (url.includes('/v1/service-agreements/page')) {
      const items = url.includes('workspaceId=') ? [workspaceAgreement] : [globalAgreement];
      return json({ items, total: items.length, limit: 20, offset: 0 });
    }
    if (url.includes('/v1/service-agreements')) {
      // The unpaginated picker endpoint: workspace + global (staff) or global only (admin).
      const hasWorkspace = url.includes('workspaceId=');
      return json({
        items: hasWorkspace ? [workspaceAgreement, globalAgreement] : [globalAgreement],
      });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  // We need to cast because the types don't align perfectly with our mockFn signature
  // but we know it behaves like fetch for our tests.
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Service Agreements Console Integration Test Suite', () => {
  it('opens the New agreement modal (title + description) at /new', async () => {
    withAgreements(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/service-agreements/new');
    const modal = await screen.findByRole(
      'dialog',
      { name: /new service agreement/i },
      { timeout: 32000 },
    );
    expect(within(modal).getByLabelText(/title/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText(/description/i)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /create agreement/i })).toBeInTheDocument();
  });

  it('drives the paginated browse API from the search + sort controls', async () => {
    const fetchMock = withAgreements(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/service-agreements/');
    await screen.findByRole('link', { name: 'Terms of service' }, { timeout: 32000 });
    const user = userEvent.setup();
    const pageCall = (predicate: (url: string) => boolean) =>
      fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return url.includes('/v1/service-agreements/page') && predicate(url);
      });
    // Default browse carries paging + default sort, scoped to the workspace.
    expect(pageCall((url) => url.includes('workspaceId=') && url.includes('sort=updated'))).toBe(
      true,
    );
    await user.type(screen.getByRole('searchbox'), 'priv');
    await waitFor(() => expect(pageCall((url) => url.includes('q=priv'))).toBe(true));
    await user.click(screen.getByRole('button', { name: /sort by title/i }));
    await waitFor(() => expect(pageCall((url) => url.includes('sort=title'))).toBe(true));
  });

  it('admin surface lists global agreements only', async () => {
    const admin = { ...authedUser, roles: ['admin'] };
    withAgreements(mockAuth(admin, { workspaces: [riverton] }));
    renderApp('/admin/service-agreements/');
    expect(
      await screen.findByRole('link', { name: 'Privacy policy' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Terms of service' })).not.toBeInTheDocument();
  });
});
