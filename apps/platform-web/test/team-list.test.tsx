import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};

const members = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin' as const,
    status: 'active' as const,
    displayName: 'Priya Anand',
    email: 'priya@riverton.gov',
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

function withMembers(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/members/page')) {
      return json({ items: members, total: members.length, limit: 20, offset: 0 });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('team list', () => {
  it('renders members and drives the browse API from search + sort', async () => {
    const fetchMock = withMembers(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/team');
    // Wait on a table-unique member (the authed user's own name appears in the profile menu).
    expect(await screen.findByText('Sam Lee', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Priya Anand')).toBeInTheDocument();
    const user = userEvent.setup();
    const pageCall = (predicate: (url: string) => boolean) =>
      fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return url.includes('/members/page') && predicate(url);
      });
    // Default browse keeps the admins-first (role) sort.
    expect(pageCall((url) => url.includes('sort=role') && url.includes('order=asc'))).toBe(true);
    await user.type(screen.getByRole('searchbox'), 'sam');
    await waitFor(() => expect(pageCall((url) => url.includes('q=sam'))).toBe(true));
    await user.click(screen.getByRole('button', { name: /sort by member/i }));
    await waitFor(() => expect(pageCall((url) => url.includes('sort=name'))).toBe(true));
  });
});
