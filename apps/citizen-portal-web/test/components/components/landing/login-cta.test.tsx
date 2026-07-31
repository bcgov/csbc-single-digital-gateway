import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginCta } from '@/components/landing/login-cta';

// Mock Link from @tanstack/react-router to avoid router context setup
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock useLoginUrl hook to avoid TanStack Router hook dependency
vi.mock('@/lib/auth', () => ({
  useLoginUrl: vi.fn(() => '/mock-login-url'),
}));

describe('LoginCta Component', () => {
  it('renders CTA elements and the BC Services Card log in button', () => {
    render(<LoginCta />);

    // Assert main header is present
    expect(screen.getByText('Log in to get started')).toBeInTheDocument();

    // Assert supporting description is present
    expect(
      screen.getByText('Log in to apply for services and manage your requests.'),
    ).toBeInTheDocument();

    // Assert the login button is present and links to the mocked login url
    const loginLink = screen.getByRole('link', { name: 'Log in with BC Services Card Account' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/mock-login-url');
  });
});
