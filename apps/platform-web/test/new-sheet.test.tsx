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

  it('opens a side sheet: Service links out, Application is a button', async () => {
    const { sheet } = await openSheet();
    expect(within(sheet).getByRole('link', { name: /Service/ })).toHaveAttribute(
      'href',
      '/app/riverton/services',
    );
    expect(within(sheet).getByRole('button', { name: /Application/ })).toBeInTheDocument();
  });

  it('Application closes the sheet and opens the application-type modal', async () => {
    const { user, sheet } = await openSheet();
    await user.click(within(sheet).getByRole('button', { name: /Application/ }));

    const modal = await screen.findByRole('dialog', { name: /new application/i });
    expect(within(modal).getByText('Basic form')).toBeInTheDocument();
    expect(within(modal).getByText('Multi-stage form')).toBeInTheDocument();
    expect(within(modal).getByText(/External link/i)).toBeInTheDocument();
    // The sheet is gone.
    expect(screen.queryByRole('dialog', { name: /create new/i })).not.toBeInTheDocument();
  });

  it('disables the New button when there is no active workspace', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    await screen.findByRole('dialog', { name: /create workspace/i });
    expect(screen.getByRole('button', { name: 'New' })).toBeDisabled();
  });
});

describe('Applications page "New application" button', () => {
  it('opens the application-type modal', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/riverton/applications');
    const user = userEvent.setup();

    await screen.findByText(/No applications yet/i);
    await user.click(screen.getByRole('button', { name: /New application/i }));

    const modal = await screen.findByRole('dialog', { name: /new application/i });
    expect(within(modal).getByText('Basic form')).toBeInTheDocument();
    expect(within(modal).getByText('Multi-stage form')).toBeInTheDocument();
    expect(within(modal).getByText(/External link/i)).toBeInTheDocument();
  });
});
