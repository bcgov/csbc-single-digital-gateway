import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginCta } from '@/components/landing/login-cta';

// Mock useLoginUrl from '@/lib/auth' to avoid setting up routing context
vi.mock('@/lib/auth', () => ({
  useLoginUrl: () => 'https://mock-login-url/auth/login',
}));

describe('LoginCta Component', () => {
  it('renders the title and description', () => {
    render(<LoginCta />);

    expect(screen.getByRole('heading', { name: 'Log in to get started' })).toBeInTheDocument();
    expect(
      screen.getByText('Log in to apply for services and manage your requests.'),
    ).toBeInTheDocument();
  });

  it('renders the BC Services Card login button with correct login URL', () => {
    render(<LoginCta />);

    const loginButtonLink = screen.getByRole('link', {
      name: /log in with bc services card account/i,
    });
    expect(loginButtonLink).toBeInTheDocument();
    expect(loginButtonLink).toHaveAttribute('href', 'https://mock-login-url/auth/login');
  });
});
