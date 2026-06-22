import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '@/components/home-page';

describe('citizen-portal-web landing', () => {
  it('greets with the application name', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Hello, citizen-portal-web.' })).toBeInTheDocument();
  });

  it('centers the greeting on the full viewport', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    expect(main?.className).toContain('min-h-svh');
    expect(main?.className).toContain('items-center');
    expect(main?.className).toContain('justify-center');
  });
});
