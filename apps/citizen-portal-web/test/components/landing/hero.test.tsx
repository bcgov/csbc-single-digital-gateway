import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Hero } from '@/components/landing/hero';

// Mock useLoginUrl hook to avoid TanStack Router hook dependency
vi.mock('@/lib/auth', () => ({
  useLoginUrl: vi.fn(() => '/mock-login-url'),
}));

describe('Hero Component', () => {
  it('renders marketing elements and the BC Services Card log in button', () => {
    render(<Hero />);

    // Assert main headline is present
    expect(
      screen.getByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();

    // Assert supporting description is present
    expect(
      screen.getByText('Find and use Government of British Columbia services.'),
    ).toBeInTheDocument();

    // Assert the login button is present and links to the mocked login url
    const loginLink = screen.getByRole('link', { name: 'Log in with BC Services Card Account' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/mock-login-url');
  });
});
