import { screen, within } from '@testing-library/react';
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

describe('header "New" button', () => {
  async function openSheet() {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/riverton');
    const user = userEvent.setup();
    // Wait for the workspace-scoped console to finish loading before opening the sheet.
    await screen.findByText(/Overview is being set up/i);
    await user.click(screen.getByRole('button', { name: 'New' }));
    return { user, sheet: await screen.findByRole('dialog', { name: /create new/i }) };
  }

  it('opens a side sheet with the Service option (applications are created within a service)', async () => {
    const { sheet } = await openSheet();
    expect(within(sheet).getByRole('link', { name: /Service/ })).toHaveAttribute(
      'href',
      '/app/riverton/services',
    );
    // The "Application" option was removed — methods are created from the service detail.
    expect(within(sheet).queryByRole('button', { name: /Application/ })).not.toBeInTheDocument();
  });

  it('disables the New button when there is no active workspace', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    await screen.findByRole('dialog', { name: /create workspace/i });
    expect(screen.getByRole('button', { name: 'New' })).toBeDisabled();
  });
});
