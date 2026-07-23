import { configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, stubLocationAssign } from '../support/render-app';
import { Route } from '@/routes/admin';

configure({ asyncUtilTimeout: 16000 });

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };
const nonAdminUser = { ...authedUser, roles: ['staff'] };

describe('Admin Route Integration', () => {
  it('verifies route has a valid component definition', () => {
    expect(Route.options.component).toBeDefined();
  });

  describe('beforeLoad auth guard branches', () => {
    it('redirects anonymous users to the BFF login URL and encodes the return path', async () => {
      const { replace, restore } = stubLocationAssign();
      mockAuth(null);
      renderApp('/admin');

      await waitFor(() => {
        expect(replace).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
      });
      const [url] = replace.mock.calls[0] as [string];
      expect(url).toContain('returnTo=');
      restore();
    });

    it('redirects authenticated non-admin staff to /app', async () => {
      mockAuth(nonAdminUser);
      const { router } = renderApp('/admin');

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/app');
      });
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('admits authenticated admin users and mounts the admin layout', async () => {
      mockAuth(adminUser);
      renderApp('/admin');

      expect(await screen.findByRole('complementary')).toBeInTheDocument();
    });
  });

  describe('AdminLayout structural behaviors', () => {
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
});
