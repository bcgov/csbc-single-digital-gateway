import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageShell } from '@/components/layout/page-shell';

// Mock SiteHeader and SiteFooter components to isolate PageShell testing
vi.mock('@/components/layout/site-header', () => ({
  SiteHeader: ({ variant, user, onLogout, activeNav }: any) => (
    <header data-testid="site-header" data-variant={variant} data-active-nav={activeNav}>
      {user ? <span data-testid="header-user">{user.name}</span> : null}
      <button data-testid="header-logout-btn" onClick={onLogout}>
        Header Logout
      </button>
    </header>
  ),
}));

vi.mock('@/components/layout/site-footer', () => ({
  SiteFooter: () => <footer data-testid="site-footer">Footer</footer>,
}));

describe('PageShell Component', () => {
  it('renders skip link, main content with children, and footer', () => {
    render(
      <PageShell variant="anonymous">
        <div data-testid="child-content">Main Children Content</div>
      </PageShell>,
    );

    // Skip to main content link
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    // Main section
    const mainSection = screen.getByRole('main');
    expect(mainSection).toBeInTheDocument();
    expect(mainSection).toHaveAttribute('id', 'main-content');
    expect(screen.getByTestId('child-content')).toHaveTextContent('Main Children Content');

    // Footer
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });

  it('correctly forwards props to SiteHeader', () => {
    const mockUser = { name: 'Alice Smith', email: 'alice@example.com' };
    const onLogout = vi.fn();

    render(
      <PageShell variant="authenticated" user={mockUser} activeNav="services" onLogout={onLogout}>
        <div>Content</div>
      </PageShell>,
    );

    const header = screen.getByTestId('site-header');
    expect(header).toHaveAttribute('data-variant', 'authenticated');
    expect(header).toHaveAttribute('data-active-nav', 'services');

    expect(screen.getByTestId('header-user')).toHaveTextContent('Alice Smith');
  });

  it('correctly executes onLogout when triggered from header', async () => {
    const onLogout = vi.fn();

    render(
      <PageShell variant="authenticated" onLogout={onLogout}>
        <div>Content</div>
      </PageShell>,
    );

    await userEvent.click(screen.getByTestId('header-logout-btn'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
