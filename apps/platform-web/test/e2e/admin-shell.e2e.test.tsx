import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';
import '@/routes/admin';
import '@/routes/admin.document-types';
import '@/routes/admin.document-types.index';

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

describe('Admin Shell Integration Test Suite', () => {
  it('renders the admin nav + "Back to app" for an admin', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    expect(await screen.findByText(/admin overview is being set up/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Document Types' })).toHaveAttribute(
      'href',
      '/admin/document-types',
    );
    expect(screen.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '/app');
  });

  it('renders the Document Types placeholder at /admin/document-types', async () => {
    mockAuth(adminUser);
    renderApp('/admin/document-types');
    expect(await screen.findByText(/No document types yet/i)).toBeInTheDocument();
  });

  it('redirects a non-admin away from /admin to /app', async () => {
    mockAuth(authedUser, { workspaces: [] });
    const { router } = renderApp('/admin');

    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
    expect(screen.queryByRole('link', { name: 'Document Types' })).not.toBeInTheDocument();
  });
});

describe('admin entry in the account menu', () => {
  it('shows an Admin link for admins', async () => {
    mockAuth(adminUser, { workspaces: [riverton] });
    renderApp('/app/riverton');

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: /account menu/i }, { timeout: 32000 }),
    );
    expect(await screen.findByRole('menuitem', { name: 'Admin' })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('hides the Admin link for non-admins', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/riverton');

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /account menu/i }));
    await screen.findByRole('menuitem', { name: /account settings/i });
    expect(screen.queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
  });
});
