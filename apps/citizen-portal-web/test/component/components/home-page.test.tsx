import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HomePage } from '@/components/home-page';
import { useAuth } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { logout } from '@/lib/bff';

// Mock components
vi.mock('@/components/layout/page-shell', () => ({
  PageShell: ({ children, variant, activeNav, user, onLogout }: any) => (
    <div
      data-testid="page-shell"
      data-variant={variant}
      data-active-nav={activeNav}
      data-user={JSON.stringify(user)}
    >
      <button data-testid="logout-btn" onClick={onLogout}>
        Logout
      </button>
      {children}
    </div>
  ),
}));

vi.mock('@repo/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@/components/landing/available-services', () => ({
  AvailableServices: ({ services, applications, loading }: any) => (
    <div data-testid="available-services" data-loading={loading ? 'true' : 'false'}>
      {services.map((s: any) => (
        <div key={s.id}>{s.title}</div>
      ))}
      {applications && <div data-testid="avail-apps-count">{applications.length}</div>}
    </div>
  ),
}));

vi.mock('@/components/landing/hero', () => ({
  Hero: () => <div data-testid="hero">Hero Section</div>,
}));

vi.mock('@/components/landing/login-cta', () => ({
  LoginCta: () => <div data-testid="login-cta">Login CTA</div>,
}));

vi.mock('@/components/landing/track-applications', () => ({
  TrackApplications: ({ applications, loading }: any) => (
    <div data-testid="track-applications" data-loading={loading ? 'true' : 'false'}>
      Applications Count: {applications.length}
    </div>
  ),
}));

vi.mock('@/components/landing/what-you-can-do', () => ({
  WhatYouCanDo: () => <div data-testid="what-you-can-do">What You Can Do</div>,
}));

// Mock auth lib hooks/fns
vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
  firstName: (name: string) => name.split(' ')[0],
}));

// Mock bff lib fns
vi.mock('@/lib/bff', () => ({
  logout: vi.fn(),
  displayName: (user: any) => user.claims.name || user.id,
}));

// Mock catalog queries
vi.mock('@/lib/catalog', () => ({
  servicesQueryOptions: vi.fn(() => ({ queryKey: ['services'] })),
  myApplicationsQueryOptions: vi.fn(() => ({ queryKey: ['myApplications'] })),
}));

// Mock useQuery hook from react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('HomePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading/skeleton state when isPending is true', () => {
    vi.mocked(useAuth).mockReturnValue({
      data: undefined,
      isPending: true,
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isPending: true,
    } as any);

    render(<HomePage />);

    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBe(2);
    expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('renders anonymous (signed-out) view when no user session exists', () => {
    vi.mocked(useAuth).mockReturnValue({
      data: null,
      isPending: false,
    } as any);

    // Mock services query
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'services') {
        return { data: [{ id: 's1', title: 'Service 1' }], isPending: false } as any;
      }
      return { data: [], isPending: false } as any;
    });

    render(<HomePage />);

    const shell = screen.getByTestId('page-shell');
    expect(shell).toHaveAttribute('data-variant', 'anonymous');
    expect(shell).toHaveAttribute('data-active-nav', 'home');

    expect(screen.getByTestId('hero')).toBeInTheDocument();
    expect(screen.getByTestId('what-you-can-do')).toBeInTheDocument();
    expect(screen.getByTestId('available-services')).toBeInTheDocument();
    expect(screen.getByText('Service 1')).toBeInTheDocument();
    expect(screen.getByTestId('login-cta')).toBeInTheDocument();

    // TrackApplications should NOT be rendered for signed-out users
    expect(screen.queryByTestId('track-applications')).not.toBeInTheDocument();
  });

  it('renders authenticated (signed-in) view when user session exists', () => {
    const mockUser = {
      id: 'user-123',
      claims: {
        name: 'Amina Ali',
        email: 'amina@example.com',
      },
    };

    vi.mocked(useAuth).mockReturnValue({
      data: mockUser,
      isPending: false,
    } as any);

    // Mock queries
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'services') {
        return { data: [{ id: 's1', title: 'Service 1' }], isPending: false } as any;
      }
      if (options.queryKey[0] === 'myApplications') {
        return { data: [{ id: 'a1', formTitle: 'App 1' }], isPending: false } as any;
      }
      return { data: undefined, isPending: false } as any;
    });

    render(<HomePage />);

    const shell = screen.getByTestId('page-shell');
    expect(shell).toHaveAttribute('data-variant', 'authenticated');
    expect(shell).toHaveAttribute(
      'data-user',
      JSON.stringify({ name: 'Amina Ali', email: 'amina@example.com' }),
    );

    // Greeting
    expect(screen.getByRole('heading', { level: 1, name: 'Hi, Amina' })).toBeInTheDocument();
    expect(screen.getByText('Welcome to MyBC.')).toBeInTheDocument();

    // Sub-components
    expect(screen.getByTestId('track-applications')).toBeInTheDocument();
    expect(screen.getByText('Applications Count: 1')).toBeInTheDocument();

    expect(screen.getByTestId('available-services')).toBeInTheDocument();
    expect(screen.getByText('Service 1')).toBeInTheDocument();

    expect(screen.getByTestId('what-you-can-do')).toBeInTheDocument();

    // Hero and Login CTA should NOT be rendered for signed-in users
    expect(screen.queryByTestId('hero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-cta')).not.toBeInTheDocument();
  });

  it('calls logout and redirects to root when onLogout is triggered', async () => {
    const mockUser = {
      id: 'user-123',
      claims: {
        name: 'Amina Ali',
        email: 'amina@example.com',
      },
    };

    vi.mocked(useAuth).mockReturnValue({
      data: mockUser,
      isPending: false,
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    // Mock window.location.assign
    const assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: assignMock },
    });

    render(<HomePage />);

    const logoutBtn = screen.getByTestId('logout-btn');
    fireEvent.click(logoutBtn);

    expect(logout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith('/');
    });
  });

  it('handles nullish/empty data queries gracefully', () => {
    const mockUser = {
      id: 'user-123',
      claims: {
        name: 'Amina Ali',
        email: 'amina@example.com',
      },
    };

    vi.mocked(useAuth).mockReturnValue({
      data: mockUser,
      isPending: false,
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isPending: false,
    } as any);

    render(<HomePage />);

    expect(screen.getByTestId('track-applications')).toBeInTheDocument();
    expect(screen.getByText('Applications Count: 0')).toBeInTheDocument();
  });

  it('handles nullish services data query in anonymous view gracefully', () => {
    vi.mocked(useAuth).mockReturnValue({
      data: null,
      isPending: false,
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isPending: false,
    } as any);

    render(<HomePage />);

    expect(screen.getByTestId('available-services')).toBeInTheDocument();
  });
});
