import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '@/components/home-page';

describe('citizen-portal-web anonymous landing', () => {
  it('leads with the hero headline', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();
  });

  it('renders the marketing sections', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Available services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Log in to get started' })).toBeInTheDocument();
  });

  it('offers login links that point at the BFF /auth/login endpoint', () => {
    render(<HomePage />);
    const links = screen.getAllByRole('link', { name: /log in/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((link) => link.getAttribute('href')?.includes('/auth/login'))).toBe(true);
  });

  it('lists the available services', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('link', { name: /Income and Disability Assistance/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Birth Registration/i })).toBeInTheDocument();
  });
});
