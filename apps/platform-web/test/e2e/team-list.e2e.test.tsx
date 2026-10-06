import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../support/render-app';
import { createMockMembersListBff } from '../support/create-mock-members-list-bff';
import { ISO } from '../support/fixtures';
import { addMembers } from '../support/testHelpers';

afterEach(() => {
  vi.restoreAllMocks();
});

const members = addMembers([
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
]);

describe('Team List E2E Test Suite', () => {
  it('renders members and drives the browse API from search + sort', async () => {
    const fetchMock = createMockMembersListBff({ items: members });
    renderApp('/app/riverton/team');
    // Wait on a table-unique member (the authed user's own name appears in the profile menu).
    expect(await screen.findByText('Sam Lee', undefined, { timeout: 15000 })).toBeInTheDocument();
    expect(screen.getByText('Maya Reyes')).toBeInTheDocument();
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
