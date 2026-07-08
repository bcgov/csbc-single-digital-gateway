import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackApplications } from '@/components/landing/track-applications';
import type { MyApplication } from '@/lib/catalog';

// Mock Link from @tanstack/react-router to avoid router context setup
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    const href = to.replace('$id', params?.id || '');
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe('TrackApplications Component', () => {
  const mockApplications: MyApplication[] = [
    {
      id: 'app-1',
      serviceId: 'svc-1',
      serviceVersionId: 'ver-1',
      serviceTitle: 'Income Assistance',
      formTitle: 'Income Assistance Application',
      reference: '20260708-0001',
      status: 'pending',
      statusLabel: 'Submitted',
      lastUpdated: '2026-07-08T12:00:00.000Z',
    },
    {
      id: 'app-2',
      serviceId: 'svc-2',
      serviceVersionId: 'ver-2',
      serviceTitle: 'Child Care Benefit',
      formTitle: 'Child Care Benefit Application',
      reference: '20260708-0002',
      status: 'approved',
      statusLabel: 'Approved',
      lastUpdated: '2026-07-08T12:30:00.000Z',
    },
  ];

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(
      <TrackApplications applications={mockApplications} loading={true} />,
    );

    // Assert skeleton is rendered
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Should not render applications list or empty state
    expect(screen.queryByText('Income Assistance Application')).not.toBeInTheDocument();
    expect(screen.queryByText('You have no applications to track')).not.toBeInTheDocument();
  });

  it('renders empty state when applications list is empty', () => {
    render(<TrackApplications applications={[]} loading={false} />);

    // Assert empty state title and instructions are displayed
    expect(screen.getByText('You have no applications to track')).toBeInTheDocument();
    expect(
      screen.getByText('When you apply for a service, you’ll be able to track its status here.'),
    ).toBeInTheDocument();

    // Should not render any application rows
    expect(screen.queryByText('Income Assistance Application')).not.toBeInTheDocument();
  });

  it('renders list of applications when applications are provided', () => {
    render(<TrackApplications applications={mockApplications} loading={false} />);

    // Assert section heading is present
    expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();

    // Assert both applications are rendered with details
    expect(screen.getByText('Income Assistance Application')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Income Assistance')).toBeInTheDocument();
    expect(screen.getByText(/20260708-0001/)).toBeInTheDocument();

    expect(screen.getByText('Child Care Benefit Application')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Child Care Benefit')).toBeInTheDocument();
    expect(screen.getByText(/20260708-0002/)).toBeInTheDocument();

    // Verify links are rendered correctly pointing to details
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/applications/app-1');
    expect(links[1]).toHaveAttribute('href', '/applications/app-2');

    // Should not render empty state
    expect(screen.queryByText('You have no applications to track')).not.toBeInTheDocument();
  });
});
