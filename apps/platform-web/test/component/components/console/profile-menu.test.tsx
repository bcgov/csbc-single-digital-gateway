import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileMenu } from '@/components/console/profile-menu';
import { logout } from '@/lib/bff';
import { adminUser, mockUserNoEmail } from '../../../support/fixtures';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ to, children, ...props }: any) => {
    return (
      <a href={to} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/lib/bff', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/bff')>();
  return {
    ...original,
    logout: vi.fn(),
  };
});

function renderProfileMenu(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileMenu />
    </QueryClientProvider>,
  );
}

describe('ProfileMenu Component Test Suite', () => {
  let queryClient: QueryClient;
  const mockAssign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock window.location.assign
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        assign: mockAssign,
      },
      configurable: true,
    });
  });

  it('Should render loading state when user is loading/fetching', () => {
    renderProfileMenu(queryClient);

    // Should display skeleton loaders and placeholder avatar
    expect(screen.getByText('··')).toBeInTheDocument();
    // In our component, if user is not loaded, two Skeletons are rendered.
    // They are rendered inside a container. We can assert the placeholder role or class.
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });

  it('Should show the user initials on the avatar trigger, with name/role inside the menu', async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(['auth', 'me'], adminUser);

    renderProfileMenu(queryClient);

    // Avatar-only trigger shows initials; name is not shown inline (it moved into the menu).
    expect(await screen.findByText('MR')).toBeInTheDocument();
    expect(screen.queryByText('Maya Reyes')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(await screen.findByText('Maya Reyes')).toBeInTheDocument();
    // "Admin" appears as the role caption and (for admins) the Admin menu item.
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
  });

  it('Should open the account menu with the correct items when clicked', async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(['auth', 'me'], adminUser);

    renderProfileMenu(queryClient);

    const triggerBtn = await screen.findByRole('button');
    await user.click(triggerBtn);

    // Verify Dropdown items and user details within it
    expect(await screen.findByText('maya.reyes@riverton.gov')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Account settings/i })).toBeInTheDocument();
    // Admins get the Admin link (moved here from the sidebar in feature 160).
    expect(screen.getByRole('menuitem', { name: /^Admin$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Help & support/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Log out/i })).toBeInTheDocument();
  });

  it('Should hide the Admin link for non-admin users', async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(['auth', 'me'], {
      id: 'u-9',
      roles: ['staff'],
      claims: { sub: 'sub-9', name: 'Staffer', preferred_username: 'staffer' },
    });

    renderProfileMenu(queryClient);

    await user.click(await screen.findByRole('button'));
    expect(await screen.findByRole('menuitem', { name: /Account settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Admin$/i })).not.toBeInTheDocument();
  });

  it('Should trigger logout endpoint and redirect to landing page on Log out click', async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(['auth', 'me'], adminUser);
    vi.mocked(logout).mockResolvedValueOnce();

    renderProfileMenu(queryClient);

    const triggerBtn = await screen.findByRole('button');
    await user.click(triggerBtn);

    const logoutItem = await screen.findByRole('menuitem', { name: /Log out/i });
    await user.click(logoutItem);

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
    expect(mockAssign).toHaveBeenCalledWith('/');
  });

  it('Should not render email in dropdown if email claim is missing', async () => {
    const user = userEvent.setup();
    queryClient.setQueryData(['auth', 'me'], mockUserNoEmail);

    renderProfileMenu(queryClient);

    const triggerBtn = await screen.findByRole('button');
    await user.click(triggerBtn);

    expect((await screen.findAllByText('Test User No Email')).length).greaterThan(0);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('Should not render user header block in dropdown when user is not loaded', async () => {
    const user = userEvent.setup();
    renderProfileMenu(queryClient);

    const triggerBtn = screen.getByRole('button');
    await user.click(triggerBtn);

    expect(await screen.findByRole('menuitem', { name: /Account settings/i })).toBeInTheDocument();
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });
});
