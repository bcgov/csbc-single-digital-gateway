import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../../support/render-app';

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

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

describe('App Slug Settings Route', () => {
  it('renders the settings page correctly for an admin', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/riverton/settings');

    // Wait for General settings card title to render
    expect(
      await screen.findByLabelText('Workspace name', {}, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Check basic description
    expect(screen.getByText('Basic workspace information.')).toBeInTheDocument();

    // Verify workspace name form is rendered with the correct workspace name
    const nameInput = await screen.findByLabelText(/workspace name/i);
    expect(nameInput).toHaveValue('Riverton');

    // Danger zone assertions
    expect(screen.getByText('Danger zone')).toBeInTheDocument();
    expect(
      screen.getByText('Deleting a workspace removes all of its data and members.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete workspace/i })).toBeInTheDocument();
  });
});
