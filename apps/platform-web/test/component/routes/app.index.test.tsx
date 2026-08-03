import { screen, waitFor } from '@testing-library/react';
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

vi.mock('@/components/console/create-workspace-modal', () => ({
  CreateWorkspaceModal: ({ dismissable }: any) => (
    <div>
      <h3>Create workspace</h3>
      <label htmlFor="workspace-name">Workspace name</label>
      <input id="workspace-name" />
      <button>Create workspace</button>
      {dismissable && <button>Cancel</button>}
    </div>
  ),
}));

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

describe('App Index Route (Workspace Gate)', () => {
  it('redirects to the newest workspace if at least one exists', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    const { router } = renderApp('/app/');

    // Verify router redirects to the workspace path /app/riverton
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app/riverton');
    });

    // Check that child overview placeholder renders
    expect(
      await screen.findByText(
        'Overview is being set up — placeholder layout shown until you choose what to track.',
        {},
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
  });

  it('renders the workspace onboarding gate if no workspaces exist', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app/');

    // Verify "Create workspace" dialog is rendered
    expect(
      await screen.findByRole('heading', { name: 'Create workspace' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Check the label and create button
    expect(screen.getByLabelText('Workspace name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();

    // Cancel button should NOT be present since dismissable is false
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
