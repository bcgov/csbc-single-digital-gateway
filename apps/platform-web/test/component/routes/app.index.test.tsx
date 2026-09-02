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

describe('App Index Route (Workspace Selection)', () => {
  it('lists the workspaces without redirecting when at least one exists', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    const { router } = renderApp('/app/');

    const link = await screen.findByRole('link', { name: /riverton/i }, { timeout: 32000 });
    expect(link).toHaveAttribute('href', '/app/riverton');
    // No auto-redirect — the user stays on /app to choose.
    expect(router.state.location.pathname).toMatch(/^\/app\/?$/);
  });

  it('shows an empty state with a Create workspace action when no workspaces exist', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app/');

    expect(
      await screen.findByText(/no workspaces yet/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
    // No forced modal / no Cancel gate anymore.
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
