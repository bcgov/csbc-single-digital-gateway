import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrackApplications } from '@/components/landing/track-applications';
import type { MyApplication } from '@/lib/catalog';

// Mock Link from @tanstack/react-router to avoid router context setup
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    // Doc 292 rule 7: fill in whichever params the route takes.
    const href = Object.entries(params ?? {}).reduce(
      (path: string, [key, value]) => path.replace(`$${key}`, String(value)),
      to,
    );
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
      serviceId: null,
      formId: 'form-1',
      formVersionId: 'ver-1',
      formTitle: 'Income Assistance Application',
      reference: '20260708-0001',
      status: 'pending',
      statusLabel: 'Submitted',
      lastUpdated: '2026-07-08T12:00:00.000Z',
    },
    {
      id: 'app-2',
      serviceId: null,
      formId: 'form-2',
      formVersionId: 'ver-2',
      formTitle: 'Child Care Benefit Application',
      reference: '20260708-0002',
      status: 'approved',
      statusLabel: 'Approved',
      lastUpdated: '2026-07-08T12:30:00.000Z',
    },
  ];

  it('Should render loading skeleton for track applications when loading is true', () => {
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

  it('Should render empty state when applications list is empty', () => {
    render(<TrackApplications applications={[]} loading={false} />);

    // Assert empty state title and instructions are displayed
    expect(screen.getByText('You have no applications to track')).toBeInTheDocument();
    expect(
      screen.getByText('When you apply for a service, you’ll be able to track its status here.'),
    ).toBeInTheDocument();

    // Should not render any application rows
    expect(screen.queryByText('Income Assistance Application')).not.toBeInTheDocument();
  });

  it('Should render list of applications when applications are provided', () => {
    render(<TrackApplications applications={mockApplications} loading={false} />);

    // Assert section heading is present
    expect(screen.getByRole('heading', { name: 'Track your applications' })).toBeInTheDocument();

    // Assert both applications are rendered with details
    expect(screen.getByText(/Income Assistance Application/)).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    // Feature 217: the row shows the FORM title once; the owning service's name is gone.
    expect(screen.getAllByText(/Income Assistance/).length).toBe(1);
    expect(screen.getByText(/20260708-0001/)).toBeInTheDocument();

    expect(screen.getByText(/Child Care Benefit Application/)).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getAllByText(/Child Care Benefit/).length).toBe(1);
    expect(screen.getByText(/20260708-0002/)).toBeInTheDocument();

    // Doc 292 rule 7: each row links to its application page again.
    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      mockApplications.map((application) => `/applications/${application.id}`),
    );

    // Should not render empty state
    expect(screen.queryByText('You have no applications to track')).not.toBeInTheDocument();
  });
});
