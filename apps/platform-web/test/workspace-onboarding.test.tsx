import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from './support/render-app';

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

describe('workspace onboarding gate at /app', () => {
  it('shows a forced Create Workspace modal when the user has no workspace', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    const dialog = await screen.findByRole('dialog', { name: /create workspace/i });
    expect(within(dialog).getByRole('textbox')).toBeInTheDocument();
    // Forced — there is no escape (no Cancel) when the user has zero workspaces.
    expect(within(dialog).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
  });

  it('disables section navigation but keeps the profile card working with no workspace', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    await screen.findByRole('dialog', { name: /create workspace/i });
    // Nav items render but are not navigable links.
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Submissions' })).not.toBeInTheDocument();
    // The profile card still works.
    expect(screen.getByRole('button', { name: /Maya Reyes/ })).toBeInTheDocument();
  });

  it('redirects to /app/:slug (the workspace overview) when the user has a workspace', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    const { router } = renderApp('/app');

    expect(await screen.findByText(/Overview is being set up/i)).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/riverton'));
  });

  it('creates a workspace from the modal and lands on its new route', async () => {
    const fetchMock = mockAuth(authedUser, { workspaces: [], createdSlug: 'new-town' });
    const { router } = renderApp('/app');
    const user = userEvent.setup();

    const dialog = await screen.findByRole('dialog', { name: /create workspace/i });
    await user.type(within(dialog).getByRole('textbox'), 'New Town');
    await user.click(within(dialog).getByRole('button', { name: /create workspace/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/workspaces'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/new-town'));
  });
});
