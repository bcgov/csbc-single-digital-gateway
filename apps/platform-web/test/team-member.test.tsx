import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const workspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  ownerId: 'u1', // the viewer (authedUser.id) owns this workspace
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
  {
    id: 'm2',
    userId: 'u2',
    role: 'member' as const,
    status: 'active' as const,
    displayName: 'Sam Lee',
    email: 'sam@riverton.gov',
    isOwner: false,
    joinedAt: ISO,
  },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockTeamFetch(options: { user?: typeof authedUser; role?: 'admin' | 'member' } = {}) {
  const user = options.user ?? authedUser;
  const ws = { ...workspace, role: options.role ?? 'admin' };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/auth/me')) return json(user);
    if (url.includes('/auth/logout')) return new Response(null, { status: 200 });
    if (url.includes('/transfer-ownership')) return json({ ...ws, ownerId: 'u2' });
    if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
    if (/\/v1\/workspaces\/[^/]+\/members/.test(url)) return json({ items: members });
    if (url.includes('/v1/workspaces')) {
      return json({ items: [ws], total: 1, limit: 100, offset: 0 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('member profile — workspace owner', () => {
  it('locks the role/status controls and explains it on the owner profile', async () => {
    mockTeamFetch();
    renderApp('/app/riverton/team/m1');

    // First mount compiles the code-split team route — allow extra time (3rd arg waitForOptions).
    expect(
      await screen.findByRole('heading', { name: 'Maya Reyes' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    // The owner badge and the immutability note are shown.
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    expect(screen.getByText(/role and status can't be changed/i)).toBeInTheDocument();
    // Both role toggles and both status toggles are disabled.
    for (const name of ['Admin', 'Member', 'Active', 'Suspended']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    // No transfer affordance on the owner's own profile.
    expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
  });

  it('lets the owner transfer ownership to another active member', async () => {
    const fetchMock = mockTeamFetch();
    const user = userEvent.setup();
    renderApp('/app/riverton/team/m2');

    expect(await screen.findByRole('heading', { name: 'Sam Lee' })).toBeInTheDocument();
    // Sam is editable (not the owner) and the owner can transfer to them.
    expect(screen.getByRole('button', { name: 'Admin' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Make owner' }));
    await user.click(screen.getByRole('button', { name: 'Confirm transfer' }));

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/v1/workspaces/w1/transfer-ownership') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
    // The POST body carries the target user id.
    const transferCall = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('/transfer-ownership'),
    );
    expect(JSON.parse(String(transferCall?.[1]?.body))).toEqual({ userId: 'u2' });
  });

  it('shows a regular member another member’s role/status read-only (no form)', async () => {
    const viewer = { ...authedUser, id: 'u3' }; // a plain member, not an admin or the owner
    mockTeamFetch({ user: viewer, role: 'member' });
    renderApp('/app/riverton/team/m2');

    expect(
      await screen.findByRole('heading', { name: 'Sam Lee' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Role/status are visible as read-only badges, not interactive toggle buttons.
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspended' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Make owner' })).not.toBeInTheDocument();
  });
});
