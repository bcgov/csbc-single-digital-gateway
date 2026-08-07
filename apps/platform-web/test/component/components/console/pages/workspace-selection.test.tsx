import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const burnaby = {
  id: 'w2',
  slug: 'burnaby',
  name: 'Burnaby',
  role: 'member' as const,
  createdAt: '2026-06-02T00:00:00.000Z',
};

describe('WorkspaceSelectionPage Component Test Suite', () => {
  it('lists the caller workspaces as links into /app/:slug (no auto-redirect)', async () => {
    mockAuth(authedUser, { workspaces: [riverton, burnaby] });
    const { router } = renderApp('/app');

    // Stays on /app — no redirect to a workspace.
    expect(router.state.location.pathname).toBe('/app');

    const rivertonLink = await screen.findByRole('link', { name: /riverton/i }, { timeout: 32000 });
    expect(rivertonLink).toHaveAttribute('href', '/app/riverton');
    expect(screen.getByRole('link', { name: /burnaby/i })).toHaveAttribute('href', '/app/burnaby');
  });

  it('shows an empty state with a Create workspace action when the user has none', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    expect(
      await screen.findByText(/no workspaces yet/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /create workspace/i });

    const user = userEvent.setup();
    await user.click(createBtn);
    // The create dialog opens (dismissable — not the forced onboarding modal).
    expect(await screen.findByRole('dialog', { name: /create workspace/i })).toBeInTheDocument();
  });
});
