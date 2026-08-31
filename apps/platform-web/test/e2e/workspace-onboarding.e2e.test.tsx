import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

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

describe('Workspace Selection Integration Test Suite', () => {
  it('shows an empty state with a Create workspace action when the user has no workspace', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    expect(
      await screen.findByText(/no workspaces yet/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    // No forced modal: the create action is a button (no dialog until clicked).
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the minimal top bar (no switcher/nav/search) on the selection page', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    await screen.findByText(/no workspaces yet/i, undefined, { timeout: 32000 });
    // No primary nav, no switcher, no search — but the account menu still works.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });

  it('does not auto-redirect when the user has a workspace — it lists them to choose', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    const { router } = renderApp('/app');

    const link = await screen.findByRole('link', { name: /riverton/i }, { timeout: 32000 });
    expect(link).toHaveAttribute('href', '/app/riverton');
    expect(router.state.location.pathname).toBe('/app');
  });

  it('creates a workspace from the modal and lands on its new route', async () => {
    const fetchMock = mockAuth(authedUser, { workspaces: [], createdSlug: 'new-town' });
    const { router } = renderApp('/app');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: /create workspace/i }, { timeout: 32000 }),
    );
    const dialog = await screen.findByRole('dialog', { name: /create workspace/i });

    // Empty-name submit is a no-op (covers the early return branch).
    const form = within(dialog).getByRole('textbox').closest('form')!;
    fireEvent.submit(form);

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
