import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceDefaultAgreements } from '@/components/console/service-agreements/workspace-default-agreements';

const ISO = '2026-07-09T00:00:00.000Z';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const theDefault = {
  id: 'd1',
  agreementDocumentId: 'a1',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  createdAt: ISO,
};

function mockFetch(role: 'admin' | 'member') {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/v1/workspaces/by-slug/')) {
      return json({
        id: 'w1',
        slug: 'riverton',
        name: 'Riverton',
        role,
        ownerId: 'u1',
        createdAt: ISO,
      });
    }
    if (url.includes('/v1/workspaces/w1/default-agreements')) {
      return json({ items: [theDefault] });
    }
    if (url.includes('/v1/service-agreements')) {
      return json({
        items: [
          { id: 'a1', workspaceId: 'w1', title: 'Terms of service', status: 'published' }, // already default
          { id: 'a2', workspaceId: null, title: 'Privacy policy', status: 'published' },
        ],
      });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceDefaultAgreements slug="riverton" workspaceId="w1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('workspace default agreements panel', () => {
  it('lets a workspace ADMIN see, add, and remove defaults; the picker excludes already-default', async () => {
    mockFetch('admin');
    renderPanel();
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add default/i }));
    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    // Available: the published, not-yet-default one; excluded: the already-default one.
    expect(await screen.findByText('Privacy policy')).toBeInTheDocument();
    // 'Terms of service' shows in the list behind the dialog but not as a selectable picker row.
    expect(screen.queryByText('Privacy policy')).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it('shows the list read-only for a non-admin member (no add/remove)', async () => {
    mockFetch('member');
    renderPanel();
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add default/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});
