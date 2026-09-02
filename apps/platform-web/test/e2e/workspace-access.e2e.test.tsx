import { screen, waitFor, within } from '@testing-library/react';
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

describe('accessing a workspace by slug', () => {
  it('shows a not-found state when the slug 404s', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/nope');
    expect(
      await screen.findByText(/workspace not found/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  it('disables nav and top-bar actions on a 404 workspace (the switcher stays usable)', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/nope');

    await screen.findByText(/workspace not found/i, undefined, { timeout: 32000 });
    // Section nav is disabled (not navigable links) and the search action is disabled…
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
    // …while the workspace switcher and account menu stay live. The switcher label depends on
    // whether the workspace list has resolved yet (No workspace → Select workspace).
    expect(await screen.findByText(/select workspace|no workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });
});

const townsville: WorkspaceLike = {
  id: 'w2',
  slug: 'townsville',
  name: 'Townsville',
  role: 'admin',
  createdAt: '2026-06-05T00:00:00.000Z',
};

async function confirmDelete(): Promise<void> {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', { name: /delete workspace/i }, { timeout: 8000 }),
  );
  const dialog = await screen.findByRole('alertdialog', {}, { timeout: 8000 });
  await user.click(within(dialog).getByRole('button', { name: /delete workspace/i }));
}

describe('Workspace Settings Integration Test Suite', () => {
  it('saves a new workspace name via PATCH', async () => {
    const fetchMock = mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/riverton/settings');
    const user = userEvent.setup();

    const input = await screen.findByLabelText(/workspace name/i, {}, { timeout: 8000 });
    await user.clear(input);
    await user.type(input, 'Riverton City');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/workspaces/w1'),
        expect.objectContaining({ method: 'PATCH', credentials: 'include' }),
      );
    });
  });
});

describe('deleting a workspace from settings', () => {
  it('confirms, deletes, and returns to the selection page listing the remaining workspace', async () => {
    const fetchMock = mockAuth(authedUser, { workspaces: [riverton, townsville] });
    const { router } = renderApp('/app/riverton/settings');

    await confirmDelete();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/workspaces/w1'),
        expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
      );
    });
    // No auto-redirect into a workspace — the user lands on /app to choose the remaining one.
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
    expect(
      await screen.findByRole('link', { name: /townsville/i }, { timeout: 8000 }),
    ).toHaveAttribute('href', '/app/townsville');
  });

  it('shows the empty state when the last workspace is deleted', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    const { router } = renderApp('/app/riverton/settings');

    await confirmDelete();

    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
    expect(
      await screen.findByText(/no workspaces yet/i, undefined, { timeout: 8000 }),
    ).toBeInTheDocument();
  });
});
