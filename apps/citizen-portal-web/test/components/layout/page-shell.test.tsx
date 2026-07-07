import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageShell } from '@/components/layout/page-shell';

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, className, children, 'aria-current': ariaCurrent }: any) => (
    <a href={to} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}));

// Mock useLoginUrl and initials from @/lib/auth
vi.mock('@/lib/auth', () => ({
  useLoginUrl: () => 'https://mock-login-url/auth/login',
  initials: (name: string) => name.substring(0, 2).toUpperCase(),
}));

describe('PageShell Component', () => {
  it('renders standard layout elements (header, children, footer) in anonymous mode', () => {
    render(
      <PageShell variant="anonymous">
        <div data-testid="test-content">Page Content</div>
      </PageShell>,
    );

    // Verify SiteHeader brand presence
    const brandElements = screen.getAllByText('Single Digital Gateway');
    expect(brandElements.length).toBeGreaterThanOrEqual(1);

    // Verify SiteHeader elements (Login button)
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();

    // Verify children content
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();

    // Verify SiteFooter text or element presence
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer tag usually has role contentinfo
    expect(screen.getByText(/Disclaimer/i)).toBeInTheDocument();
  });

  it('renders standard layout elements in authenticated mode with user details', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    render(
      <PageShell variant="authenticated" user={mockUser}>
        <div data-testid="test-content">Auth Page Content</div>
      </PageShell>,
    );

    // Verify Brand presence
    const brandElements = screen.getAllByText('Single Digital Gateway');
    expect(brandElements.length).toBeGreaterThanOrEqual(1);

    // Verify that the login button is NOT rendered
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();

    // Verify that the user profile trigger is present (avatar fallback with initials "JO")
    expect(screen.getByLabelText('Account menu')).toBeInTheDocument();
    expect(screen.getByText('JO')).toBeInTheDocument();

    // Verify children content
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });
});
