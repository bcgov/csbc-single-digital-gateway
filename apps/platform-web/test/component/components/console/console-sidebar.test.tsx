import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleSidebar } from '@/components/console/console-sidebar';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, activeOptions, activeProps, ...props }: any) => {
    let href = to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a
        href={href}
        data-testid="router-link"
        data-active-options={JSON.stringify(activeOptions)}
        data-active-props={JSON.stringify(activeProps)}
        {...props}
      >
        {children}
      </a>
    );
  },
}));

let mockUser: any = null;
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    data: mockUser,
  }),
}));

vi.mock('@/components/console/profile-menu', () => ({
  ProfileMenu: () => <div data-testid="mock-profile-menu">Profile Menu</div>,
}));

vi.mock('@/components/console/workspace-switcher', () => ({
  WorkspaceSwitcher: () => <div data-testid="mock-workspace-switcher">Switcher</div>,
}));

describe('ConsoleSidebar Component Test Suite', () => {
  beforeEach(() => {
    mockUser = { roles: ['user'] };
    vi.clearAllMocks();
  });

  it('sets data-collapsed attribute on the aside container correctly', () => {
    const { rerender } = render(<ConsoleSidebar collapsed={true} slug="riverton" />);
    const rail = screen.getByRole('complementary');
    expect(rail).toHaveAttribute('data-collapsed', 'true');

    rerender(<ConsoleSidebar collapsed={false} slug="riverton" />);
    expect(rail).toHaveAttribute('data-collapsed', 'false');
  });

  it('renders scoped nav items as links when slug is defined', () => {
    render(<ConsoleSidebar collapsed={false} slug="riverton" />);

    // Verify workspace switcher is in the sidebar
    expect(screen.getByTestId('mock-workspace-switcher')).toBeInTheDocument();

    // Verify Nav items render as links
    const overviewLink = screen.getByRole('link', { name: 'Overview' });
    expect(overviewLink).toBeInTheDocument();
    expect(overviewLink).toHaveAttribute('href', '/app/riverton');
    expect(overviewLink).toHaveAttribute('data-active-options', '{"exact":true}');
    expect(overviewLink).toHaveAttribute(
      'data-active-props',
      '{"className":"bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-l-bcgov-blue "}',
    );

    const servicesLink = screen.getByRole('link', { name: 'Services' });
    expect(servicesLink).toBeInTheDocument();
    expect(servicesLink).toHaveAttribute('href', '/app/riverton/services');
    expect(servicesLink).toHaveAttribute('data-active-options', '{"exact":false}');

    const settingsLink = screen.getByRole('link', { name: 'Settings' });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/app/riverton/settings');

    // Profile menu is rendered
    expect(screen.getByTestId('mock-profile-menu')).toBeInTheDocument();
  });

  it('renders scoped nav items as disabled spans when slug is undefined', () => {
    render(<ConsoleSidebar collapsed={false} slug={undefined} />);

    // Nav items are rendered as disabled spans instead of links
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Services' })).not.toBeInTheDocument();

    const disabledOverview = screen.getByTitle('Overview');
    expect(disabledOverview).toBeInTheDocument();
    expect(disabledOverview).toHaveAttribute('aria-disabled', 'true');
    expect(disabledOverview).toHaveClass('cursor-not-allowed');

    const disabledServices = screen.getByTitle('Services');
    expect(disabledServices).toBeInTheDocument();
    expect(disabledServices).toHaveAttribute('aria-disabled', 'true');
    expect(disabledServices).toHaveClass('cursor-not-allowed');
  });

  it('renders Admin link if user is admin', () => {
    mockUser = { roles: ['admin'] };
    render(<ConsoleSidebar collapsed={false} slug="riverton" />);

    const adminLink = screen.getByRole('link', { name: 'Admin' });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin');
  });

  it('does not render Admin link if user is not admin', () => {
    mockUser = { roles: ['user'] };
    render(<ConsoleSidebar collapsed={false} slug="riverton" />);

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('does not render Admin link if user is null', () => {
    mockUser = null;
    render(<ConsoleSidebar collapsed={false} slug="riverton" />);

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });
});
