import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginGate } from '@/components/layout/login-gate';

vi.mock('@/lib/auth', () => ({ useLoginUrl: () => '/mock-login-url' }));

describe('LoginGate', () => {
  it('explains why sign-in is needed and links to the login URL', () => {
    render(<LoginGate message="You need to be signed in to view your account." />);
    expect(screen.getByText('You need to be signed in to view your account.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/mock-login-url');
  });

  it('accepts a custom link label', () => {
    render(<LoginGate message="You need to be signed in to apply." label="Log in to apply" />);
    expect(screen.getByRole('link', { name: 'Log in to apply' })).toBeInTheDocument();
  });
});
