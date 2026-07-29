import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgreementDefaultToggle } from '@/components/console/service-agreements/agreement-default-toggle';

const ISO = '2026-07-29T00:00:00.000Z';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const existingDefault = {
  id: 'row-1',
  agreementDocumentId: 'a1',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  createdAt: ISO,
};

/** Stub the BFF for the toggle: workspace (role-parameterized) + the workspace's defaults list, plus
 * add (POST) / remove (DELETE). Returns the mock so tests can assert the write it made. */
function mockBff(role: 'admin' | 'member', defaults: (typeof existingDefault)[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
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
      if (method === 'POST') return json({ ...existingDefault, agreementDocumentId: 'a1' });
      if (method === 'DELETE') return new Response(null, { status: 204 });
      return json({ items: defaults });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderToggle(published = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AgreementDefaultToggle
        slug="riverton"
        workspaceId="w1"
        agreementDocumentId="a1"
        published={published}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('agreement default toggle', () => {
  it('is unchecked for a published non-default agreement and POSTs an add when switched on', async () => {
    const user = userEvent.setup();
    const fetchMock = mockBff('admin', []);
    renderToggle(true);

    const toggle = await screen.findByRole('switch', { name: 'Workspace default' });
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, init]) =>
            String(u).includes('/v1/workspaces/w1/default-agreements') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('is checked when already a default and DELETEs the row when switched off', async () => {
    const user = userEvent.setup();
    const fetchMock = mockBff('admin', [existingDefault]);
    renderToggle(true);

    const toggle = await screen.findByRole('switch', { name: 'Workspace default' });
    await waitFor(() => expect(toggle).toBeChecked());

    await user.click(toggle);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([u, init]) =>
            String(u).includes('/v1/workspaces/w1/default-agreements/row-1') &&
            (init?.method ?? 'GET').toUpperCase() === 'DELETE',
        ),
      ).toBe(true);
    });
  });

  it('renders nothing for a non-admin member', async () => {
    const fetchMock = mockBff('member', []);
    renderToggle(true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('renders nothing when the agreement is not published', async () => {
    mockBff('admin', []);
    renderToggle(false);
    // Give the queries a chance to resolve; the switch must never appear.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
