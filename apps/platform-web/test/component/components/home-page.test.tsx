import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/components/home-page';

// Mock BFF lib
vi.mock('@/lib/bff', () => ({
  loginUrl: '/mocked-login-url',
}));

describe('HomePage Component Test Suite', () => {
  it('renders landing page logo, title, login button, and disclaimer links', () => {
    render(<HomePage />);

    // Logo presence
    const logo = screen.getByLabelText('Single Digital Gateway');
    expect(logo).toBeInTheDocument();

    // Heading presence
    expect(screen.getByRole('heading', { name: /Operations Portal/i })).toBeInTheDocument();

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

  it('shows the application name', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /Operations Portal/i })).toBeInTheDocument();
  });

  it('centers the greeting on the full viewport', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main?.className).toContain('min-h-svh');
    expect(main?.className).toContain('items-center');
    expect(main?.className).toContain('justify-center');
  });

  it('offers a login link that points at the BFF /auth/login endpoint', () => {
    render(<HomePage />);
    const link = screen.getByRole('link', { name: /log in/i });
    expect(link).toHaveAttribute('href', '/mocked-login-url');
  });
});
