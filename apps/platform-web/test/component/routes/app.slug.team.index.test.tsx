import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../support/render-app';
import { createMockMembersListBff } from '../../support/create-mock-members-list-bff';
import { addMembers } from '../../support/testHelpers';

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
  items: addMembers(),
};

describe('App Slug Team Index Route', () => {
  it('renders the team list queue correctly', async () => {
    createMockMembersListBff(mockMembersList);
    renderApp('/app/riverton/team/');

    // Wait for the Team section to render (Settings/Team sub-nav tab).
    expect(
      await screen.findByRole('link', { name: 'Team' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify Add member button is visible for admin workspace role
    expect(screen.getByRole('button', { name: /Add member/i })).toBeInTheDocument();

    // Verify headers inside the team table
    const memberHeaders = await screen.findAllByText('Member');
    expect(memberHeaders.length).toBeGreaterThan(0);

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Verify team member row details are correctly loaded asynchronously
    expect(await screen.findByText('Maya Reyes')).toBeInTheDocument();
    expect(screen.getByText('maya@riverton.gov')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
