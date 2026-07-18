import { configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, stubLocationAssign } from '../support/render-app';

// The TanStack Router loading chain (beforeLoad → render) can take > 1 s in jsdom on the first
// run. Give every async assertion ample headroom (mirrors the other integration test files).
configure({ asyncUtilTimeout: 8000 });

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };
const nonAdminUser = { ...authedUser, roles: ['staff'] };

// ---------------------------------------------------------------------------
// beforeLoad auth guard
// ---------------------------------------------------------------------------

describe('admin route — beforeLoad guard', () => {
  it('redirects anonymous users to the BFF login URL and encodes the return path', async () => {
    const { assign, restore } = stubLocationAssign();
    mockAuth(null);
    renderApp('/admin');

    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
    });
    const [url] = assign.mock.calls[0] as [string];
    expect(url).toContain('returnTo=');
    restore();
  });

  it('redirects authenticated non-admin staff to /app', async () => {
    mockAuth(nonAdminUser);
    const { router } = renderApp('/admin');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app');
    });
    // The admin layout must not have mounted for non-admins.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('admits authenticated admin users and mounts the admin layout', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    expect(await screen.findByRole('complementary')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AdminLayout — sidebar collapse state
// ---------------------------------------------------------------------------

describe('AdminLayout — sidebar collapse', () => {
  it('renders the sidebar expanded by default', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    const sidebar = await screen.findByRole('complementary');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });

  it('collapses the sidebar on the first toggle click', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    const sidebar = await screen.findByRole('complementary');
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));

    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  });

  it('expands the sidebar again on a second toggle click', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    const sidebar = await screen.findByRole('complementary');
    const toggle = screen.getByRole('button', { name: /toggle sidebar/i });
    const user = userEvent.setup();

    await user.click(toggle);
    await user.click(toggle);

    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });
});

// ---------------------------------------------------------------------------
// AdminLayout — navigation links
// ---------------------------------------------------------------------------

describe('AdminLayout — navigation', () => {
  it('renders the Overview nav link pointing to /admin', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    await screen.findByRole('complementary');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/admin');
  });

  it('renders the Document Types nav link pointing to /admin/document-types', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    await screen.findByRole('complementary');
    expect(screen.getByRole('link', { name: 'Document Types' })).toHaveAttribute(
      'href',
      '/admin/document-types',
    );
  });

  it('renders the "Back to app" link pointing to /app', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    await screen.findByRole('complementary');
    expect(screen.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '/app');
  });
});

// ---------------------------------------------------------------------------
// AdminLayout — header section title
// ---------------------------------------------------------------------------

describe('AdminLayout — header title', () => {
  it('shows "Overview" as the h1 title when at /admin', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    await screen.findByRole('complementary');
    expect(screen.getByRole('heading', { name: 'Overview', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Platform administration.')).toBeInTheDocument();
  });

  it('shows "Document Types" title and subtitle when at /admin/document-types', async () => {
    mockAuth(adminUser);
    renderApp('/admin/document-types');

    await screen.findByRole('complementary');
    expect(screen.getByRole('heading', { name: 'Document Types', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Manage the document type definitions/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AdminLayout — outlet renders child routes
// ---------------------------------------------------------------------------

describe('AdminLayout — outlet', () => {
  it('renders the admin index placeholder inside the main outlet', async () => {
    mockAuth(adminUser);
    renderApp('/admin');

    expect(
      await screen.findByText(/Platform administration — the admin overview is being set up/i),
    ).toBeInTheDocument();
  });
});
