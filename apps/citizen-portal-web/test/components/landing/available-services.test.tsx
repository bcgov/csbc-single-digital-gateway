import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AvailableServices } from '@/components/landing/available-services';
import type { CatalogService, MyApplication } from '@/lib/catalog';

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, hash, className, children }: any) => {
    const href = to + (hash ? `#${hash}` : '');
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

const mockServices: readonly CatalogService[] = [
  {
    id: 's1',
    title: 'Income Assistance',
    description: 'Financial support for people in need.',
  },
  {
    id: 's2',
    title: 'Birth Registration',
    description: 'Register the birth of a child in B.C.',
  },
];

const mockApplications: readonly MyApplication[] = [
  {
    id: 'a1',
    serviceId: 's2',
    serviceVersionId: 'v1',
    serviceTitle: 'Birth Registration',
    formTitle: 'Birth Registration application',
    reference: '20250615-0003',
    status: 'in_review',
    statusLabel: 'Review',
    lastUpdated: '2025-06-30T00:00:00.000Z',
  },
];

describe('AvailableServices Component', () => {
  it('renders the section heading and description', () => {
    render(<AvailableServices services={[]} />);

    expect(screen.getByRole('heading', { name: 'Discover services' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Here are some services currently available through the Single Digital Gateway.',
      ),
    ).toBeInTheDocument();
  });

  it('renders loading skeleton items when loading is true', () => {
    const { container } = render(<AvailableServices services={mockServices} loading={true} />);

    // In available-services.tsx: [0, 1].map((i) => skeleton-containing divs...)
    // Let's verify that service titles and descriptions are NOT rendered.
    expect(screen.queryByText('Income Assistance')).not.toBeInTheDocument();
    expect(screen.queryByText('Birth Registration')).not.toBeInTheDocument();

    // Since skeleton classes are used, we can verify that skeleton elements exist.
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders services and their descriptions when loaded and no applications exist', () => {
    render(<AvailableServices services={mockServices} applications={[]} />);

    // Verify both services are listed
    expect(screen.getByRole('link', { name: /Income Assistance/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Birth Registration/i })).toBeInTheDocument();

    // Verify descriptions are displayed
    expect(screen.getByText('Financial support for people in need.')).toBeInTheDocument();
    expect(screen.getByText('Register the birth of a child in B.C.')).toBeInTheDocument();

    // Verify no "Open" link or status badge is rendered
    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument();
    expect(screen.queryByText('Review')).not.toBeInTheDocument();
    expect(screen.queryByText('20250615-0003')).not.toBeInTheDocument();
  });

  it('renders application details (badge, reference, Open link) instead of description when application exists', () => {
    render(<AvailableServices services={mockServices} applications={mockApplications} />);

    // Income Assistance has no application: it should show description
    expect(screen.getByRole('link', { name: /Income Assistance/i })).toBeInTheDocument();
    expect(screen.getByText('Financial support for people in need.')).toBeInTheDocument();

    // Birth Registration has application: it should NOT show description
    expect(screen.getByRole('link', { name: /Birth Registration/i })).toBeInTheDocument();
    expect(screen.queryByText('Register the birth of a child in B.C.')).not.toBeInTheDocument();

    // Birth Registration should show "Open" link, badge and reference
    expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('20250615-0003')).toBeInTheDocument();
  });
});
