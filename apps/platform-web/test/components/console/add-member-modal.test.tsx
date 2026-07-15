import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const workspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  ownerId: 'u1',
  createdAt: ISO,
};
const members = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin' as const,
    status: 'active' as const,
    displayName: 'Maya Reyes',
    email: 'maya@riverton.gov',
    isOwner: true,
    joinedAt: ISO,
  },
];
const staff = [
  { id: 'u2', displayName: 'Sam Lee', email: 'sam@riverton.gov' },
  { id: 'u3', displayName: 'Dana Kim', email: 'dana@riverton.gov' },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockTeamFetch(role: 'admin' | 'member' = 'admin') {
  const ws = { ...workspace, role };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/auth/logout')) return new Response(null, { status: 200 });
    if (url.includes('/addable-staff')) {
      const q = (new URL(url, 'http://x').searchParams.get('q') ?? '').toLowerCase();
      const items = q
        ? staff.filter(
            (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
          )
        : staff;
      return json({ items });
    }
    const path = url.split('?')[0] ?? '';
    if (path.endsWith('/members') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { userId: string; role: 'admin' | 'member' };
      const picked = staff.find((u) => u.id === body.userId)!;
      return json(
        {
          id: 'm2',
          userId: picked.id,
          role: body.role,
          status: 'active',
          displayName: picked.displayName,
          email: picked.email,
          isOwner: false,
          joinedAt: ISO,
        },
        201,
      );
    }
    if (path.endsWith('/members')) return json({ items: members });
    if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
    if (url.includes('/v1/workspaces')) {
      return json({ items: [ws], total: 1, limit: 100, offset: 0 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('add member flow', () => {
  it('lets an admin search staff, pick a role, and add a member', async () => {
    const fetchMock = mockTeamFetch('admin');
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    // First mount compiles the code-split team route — allow extra time (3rd arg waitForOptions).
    const addButton = await screen.findByRole('button', { name: 'Add member' }, { timeout: 5000 });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    // Both staff show initially.
    expect(await within(dialog).findByText('Sam Lee')).toBeInTheDocument();
    expect(within(dialog).getByText('Dana Kim')).toBeInTheDocument();

    // Server-side search narrows the list.
    await user.type(within(dialog).getByLabelText('Search staff'), 'sam');
    await waitFor(() => expect(within(dialog).queryByText('Dana Kim')).not.toBeInTheDocument());
    expect(within(dialog).getByText('Sam Lee')).toBeInTheDocument();

    // Pick Sam, choose Admin, add.
    await user.click(within(dialog).getByText('Sam Lee'));
    await user.click(within(dialog).getByRole('button', { name: 'Admin' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith('/v1/workspaces/w1/members') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ userId: 'u2', role: 'admin' });
    });
  });

  it('hides the Add member action from non-admins', async () => {
    mockTeamFetch('member');
    renderApp('/app/riverton/team');

    expect(await screen.findByText('Maya Reyes', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });
});
