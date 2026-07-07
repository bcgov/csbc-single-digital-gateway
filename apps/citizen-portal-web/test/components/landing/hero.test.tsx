import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Hero } from '@/components/landing/hero';

// Mock useLoginUrl from '@/lib/auth' to avoid setting up routing context
vi.mock('@/lib/auth', () => ({
  useLoginUrl: () => 'https://mock-login-url/auth/login',
}));

describe('Hero Component', () => {
  it('renders the headline and supporting text', () => {
    render(<Hero />);

    expect(
      screen.getByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Find and use Government of British Columbia services.'),
    ).toBeInTheDocument();
  });

  it('renders the BC Services Card login button with the correct login URL', () => {
    render(<Hero />);

    const loginButtonLink = screen.getByRole('link', {
      name: /log in with bc services card account/i,
    });
    expect(loginButtonLink).toBeInTheDocument();
    expect(loginButtonLink).toHaveAttribute('href', 'https://mock-login-url/auth/login');
  });
});
