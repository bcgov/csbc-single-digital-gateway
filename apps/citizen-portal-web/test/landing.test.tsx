import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '@/components/home-page';

const services = [
  { id: 's1', title: 'Income and Disability Assistance', description: 'Financial support.' },
  { id: 's2', title: 'Birth Registration', description: 'Register the birth of a child in B.C.' },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('citizen-portal-web anonymous landing', () => {
  function mockServices() {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/v1/services')) return jsonResponse({ items: services });
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;
  }

  it('leads with the hero headline', () => {
    mockServices();
    renderWithClient(<HomePage />);
    expect(
      screen.getByRole('heading', { name: 'Access government services online' }),
    ).toBeInTheDocument();
  });

  it('renders the marketing sections', () => {
    mockServices();
    renderWithClient(<HomePage />);
    expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Available services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Log in to get started' })).toBeInTheDocument();
  });

  it('offers login links that point at the BFF /auth/login endpoint', () => {
    mockServices();
    renderWithClient(<HomePage />);
    const links = screen.getAllByRole('link', { name: /log in/i });
    expect(links.some((link) => link.getAttribute('href')?.includes('/auth/login'))).toBe(true);
  });

  it('renders the services from the catalog endpoint', async () => {
    mockServices();
    renderWithClient(<HomePage />);
    expect(
      await screen.findByRole('link', { name: /Income and Disability Assistance/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Birth Registration/i })).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/services'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('links Services in the header nav', () => {
    mockServices();
    renderWithClient(<HomePage />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const servicesLink = within(nav).getByRole('link', { name: 'Services' });
    expect(servicesLink).toHaveAttribute('href', '/services');
  });
});
