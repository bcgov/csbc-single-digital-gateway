import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '@/components/home-page';

describe('platform-web landing', () => {
  it('greets with the application name', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Hello, platform-web.' })).toBeInTheDocument();
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
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });
});
