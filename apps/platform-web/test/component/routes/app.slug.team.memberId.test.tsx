import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../support/render-app';
import { createMockMembersListBff } from '../../support/create-mock-members-list-bff';

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

const mockMembersList = {
  items: [
    {
      id: 'mem-123',
      userId: 'u-123',
      displayName: 'Alice Smith',
      email: 'alice@riverton.gov',
      role: 'member',
      status: 'active',
      isOwner: false,
      joinedAt: '2026-06-05T00:00:00.000Z',
    },
  ],
};

describe('App Slug Team Member ID Profile Route', () => {
  it('renders the member profile page correctly', async () => {
    createMockMembersListBff(mockMembersList);
    renderApp('/app/riverton/team/mem-123');

    // Wait for the member profile page content to load
    expect(await screen.findByText('Alice Smith', {}, { timeout: 32000 })).toBeInTheDocument();

    // Verify sub-details
    expect(screen.getByText('alice@riverton.gov')).toBeInTheDocument();
    expect(screen.getByText(/Joined/i)).toBeInTheDocument();

    // Verify form role and status toggle sections exist
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Verify edit buttons are available for Admin
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspended' })).toBeInTheDocument();

    // Save changes button should be rendered
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
