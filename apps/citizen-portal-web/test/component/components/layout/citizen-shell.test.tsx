import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { useAuth } from '@/lib/auth';
import { logout } from '@/lib/bff';

// Mock PageShell component to isolate CitizenShell testing
vi.mock('@/components/layout/page-shell', () => ({
  PageShell: ({ children, variant, activeNav, user, onLogout }: any) => (
    <div data-testid="page-shell" data-variant={variant} data-active-nav={activeNav}>
      {user ? (
        <div data-testid="user-info">
          <span>{user.name}</span>
          <span>{user.email}</span>
        </div>
      ) : null}
      <button data-testid="logout-btn" onClick={onLogout}>
        Logout
      </button>
      {children}
    </div>
  ),
}));

// Mock auth and bff modules
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/bff', () => ({
  displayName: vi.fn((user) => user.claims.name),
  logout: vi.fn(),
}));

describe('CitizenShell Component', () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: assignMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders in anonymous variant when user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({ data: null } as any);

    render(
      <CitizenShell activeNav="services">
        <div data-testid="child-content">Hello World</div>
      </CitizenShell>,
    );

    const pageShell = screen.getByTestId('page-shell');
    expect(pageShell).toHaveAttribute('data-variant', 'anonymous');
    expect(pageShell).toHaveAttribute('data-active-nav', 'services');

    expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toHaveTextContent('Hello World');
  });

  it('renders in authenticated variant with mapped user details when user is logged in', () => {
    const mockUser = {
      id: 'user-123',
      claims: {
        email: 'john.doe@example.com',
        name: 'John Doe',
      },
    };
    vi.mocked(useAuth).mockReturnValue({ data: mockUser } as any);

    render(
      <CitizenShell activeNav="home">
        <div data-testid="child-content">Home Content</div>
      </CitizenShell>,
    );

    const pageShell = screen.getByTestId('page-shell');
    expect(pageShell).toHaveAttribute('data-variant', 'authenticated');
    expect(pageShell).toHaveAttribute('data-active-nav', 'home');

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toHaveTextContent('Home Content');
  });

  it('performs logout and redirects to root when onLogout triggers', async () => {
    const mockUser = {
      id: 'user-123',
      claims: {
        email: 'john.doe@example.com',
        name: 'John Doe',
      },
    };
    vi.mocked(useAuth).mockReturnValue({ data: mockUser } as any);
    vi.mocked(logout).mockResolvedValue({} as any);

    render(
      <CitizenShell>
        <div>Content</div>
      </CitizenShell>,
    );

    await userEvent.click(screen.getByTestId('logout-btn'));

    expect(logout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('/');
    });
  });
});
