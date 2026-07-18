import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/components/home-page';

// Mock BFF lib
vi.mock('@/lib/bff', () => ({
  loginUrl: '/mocked-login-url',
}));

describe('HomePage', () => {
  it('renders landing page logo, title, login button, and disclaimer links', () => {
    render(<HomePage />);

    // Logo presence
    const logo = screen.getByLabelText('Single Digital Gateway');
    expect(logo).toBeInTheDocument();

    // Heading presence
    expect(
      screen.getByRole('heading', { name: 'Single Digital Gateway Platform' }),
    ).toBeInTheDocument();

    // Login button with OIDC redirection path
    const loginButton = screen.getByRole('link', { name: 'Log in with IDIR' });
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveAttribute('href', '/mocked-login-url');

    // Terms of use link
    const termsLink = screen.getByRole('link', { name: 'Terms of use' });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', 'https://www2.gov.bc.ca/gov/content/home/disclaimer');

    // Privacy policy link
    const privacyLink = screen.getByRole('link', { name: 'Privacy policy' });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', 'https://www2.gov.bc.ca/gov/content/home/privacy');
  });
});
