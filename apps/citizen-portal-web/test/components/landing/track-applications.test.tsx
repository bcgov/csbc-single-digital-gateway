import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackApplications } from '@/components/landing/track-applications';
import type { MyApplication } from '@/lib/catalog';

// Mock Link from @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, className, children }: any) => {
    const href = to.replace('$id', params?.id ?? '');
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

const mockApplications: readonly MyApplication[] = [
  {
    id: 'a1',
    serviceId: 's2',
    serviceVersionId: 'v1',
    serviceTitle: 'Birth Registration Service',
    formTitle: 'Birth Registration application',
    reference: '20250615-0003',
    status: 'in_review',
    statusLabel: 'Review',
    lastUpdated: '2025-06-30T00:00:00.000Z',
  },
  {
    id: 'a2',
    serviceId: 's1',
    serviceVersionId: 'v2',
    serviceTitle: 'Income Assistance Service',
    formTitle: 'Income Assistance application',
    reference: '20250701-0009',
    status: 'approved',
    statusLabel: 'Approved',
    lastUpdated: '2025-07-02T12:00:00.000Z',
  },
];

describe('TrackApplications Component', () => {
  it('renders the section heading', () => {
    render(<TrackApplications applications={[]} />);

    expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();
  });

  it('renders a skeleton indicator when loading is true', () => {
    const { container } = render(
      <TrackApplications applications={mockApplications} loading={true} />,
    );

    // Check that applications are not displayed
    expect(screen.queryByText('Birth Registration application')).not.toBeInTheDocument();
    expect(screen.queryByText('Income Assistance application')).not.toBeInTheDocument();

    // Check for skeleton element
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders EmptyState when applications list is empty and not loading', () => {
    render(<TrackApplications applications={[]} loading={false} />);

    expect(screen.getByText('You have no applications to track')).toBeInTheDocument();
    expect(
      screen.getByText('When you apply for a service, you’ll be able to track its status here.'),
    ).toBeInTheDocument();
  });

  it('renders list of applications when applications are provided', () => {
    render(<TrackApplications applications={mockApplications} loading={false} />);

    // Verify application titles
    expect(screen.getByText('Birth Registration application')).toBeInTheDocument();
    expect(screen.getByText('Income Assistance application')).toBeInTheDocument();

    // Verify service titles
    expect(screen.getByText('Birth Registration Service')).toBeInTheDocument();
    expect(screen.getByText('Income Assistance Service')).toBeInTheDocument();

    // Verify status labels
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();

    // Verify references
    expect(screen.getByText(/20250615-0003/)).toBeInTheDocument();
    expect(screen.getByText(/20250701-0009/)).toBeInTheDocument();
  });
});
