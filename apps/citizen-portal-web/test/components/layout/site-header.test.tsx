import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SiteHeader } from '@/components/layout/site-header';

// Mock UI components from @repo
vi.mock('@repo/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarFallback: ({ children }: any) => <span data-testid="avatar-fallback">{children}</span>,
}));

vi.mock('@repo/ui/logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

vi.mock('@repo/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, className, ...props }: any) => (
    <button data-testid="dropdown-trigger" className={className} {...props}>
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children, className }: any) => (
    <div data-testid="dropdown-content" className={className}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, className, onClick, render: renderProp }: any) => {
    if (renderProp) {
      return React.cloneElement(renderProp, {
        className: `${className || ''} ${renderProp.props.className || ''}`.trim(),
        onClick,
        children: (
          <>
            {renderProp.props.children}
            {children}
          </>
        ),
      });
    }
    return (
      <button data-testid="dropdown-item" className={className} onClick={onClick}>
        {children}
      </button>
    );
  },
  DropdownMenuSeparator: () => <hr />,
}));

// Mock router Link
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock auth utilities
vi.mock('@/lib/auth', () => ({
  useLoginUrl: vi.fn(() => '/mock-login-url'),
  initials: vi.fn((name) =>
    name
      .split(' ')
      .map((n: string) => n[0])
      .join(''),
  ),
}));

describe('SiteHeader Component', () => {
  it('renders the brand lockup and navigation links', () => {
    render(<SiteHeader variant="anonymous" />);

    // Brand elements
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Single Digital Gateway')).toBeInTheDocument();

    // Nav Links
    const homeLink = screen.getByRole('link', { name: 'Home' });
    const servicesLink = screen.getByRole('link', { name: 'Services' });

    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');

    expect(servicesLink).toBeInTheDocument();
    expect(servicesLink).toHaveAttribute('href', '/services');
  });

  it('sets aria-current="page" on the active navigation link', () => {
    render(<SiteHeader variant="anonymous" activeNav="services" />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    const servicesLink = screen.getByRole('link', { name: 'Services' });

    expect(homeLink).not.toHaveAttribute('aria-current');
    expect(servicesLink).toHaveAttribute('aria-current', 'page');
  });

  it('renders Log in button in anonymous variant', () => {
    render(<SiteHeader variant="anonymous" />);

    const loginLink = screen.getByRole('link', { name: /Log in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/mock-login-url');

    // Profile menu should not be rendered
    expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
  });

  it('renders ProfileMenu in authenticated variant', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    render(<SiteHeader variant="authenticated" user={mockUser} />);

    // Log in button should not be rendered
    expect(screen.queryByRole('link', { name: /Log in/i })).not.toBeInTheDocument();

    // Profile menu trigger & content should be present
    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();

    // Settings Link
    const settingsLink = screen.getByRole('link', { name: /Account settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/account');
  });

  it('triggers onLogout callback when logout dropdown item is clicked', async () => {
    const onLogout = vi.fn();
    const mockUser = { name: 'John Doe' };

    render(<SiteHeader variant="authenticated" user={mockUser} onLogout={onLogout} />);

    const logoutBtn = screen.getByRole('button', { name: /Log out/i });
    await userEvent.click(logoutBtn);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders loading placeholder in authenticated variant when user is undefined', () => {
    render(<SiteHeader variant="authenticated" user={undefined} />);

    expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('··');
    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });
});
