import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBanner } from '@/components/application/status-banner';
import type { ApplicationStatus } from '@/lib/catalog';

describe('StatusBanner Component', () => {
  const statuses: ApplicationStatus[] = [
    'draft',
    'pending',
    'in_review',
    'approved',
    'rejected',
    'needs_changes',
    'withdrawn',
  ];

  it.each(statuses)('renders correct details for status: %s', (status) => {
    render(<StatusBanner status={status} />);

    // Basic config title matching
    const expectedTitles: Record<ApplicationStatus, string> = {
      draft: 'Draft',
      pending: 'Application received',
      in_review: 'Under review',
      approved: 'Approved',
      rejected: 'Not approved',
      needs_changes: 'Action needed',
      withdrawn: 'Withdrawn',
    };

    expect(screen.getByText(expectedTitles[status], { selector: 'p' })).toBeInTheDocument();
  });

  it('renders review reason when status is needs_changes and reviewReason is provided', () => {
    render(
      <StatusBanner
        status="needs_changes"
        reviewReason="Please upload a valid identification document."
      />,
    );

    expect(
      screen.getByText('“Please upload a valid identification document.”'),
    ).toBeInTheDocument();
  });

  it('renders review reason when status is rejected and reviewReason is provided', () => {
    render(<StatusBanner status="rejected" reviewReason="Information is incorrect." />);

    expect(screen.getByText('“Information is incorrect.”')).toBeInTheDocument();
  });

  it('does not render review reason for other statuses even if provided', () => {
    render(<StatusBanner status="approved" reviewReason="Looks great!" />);

    expect(screen.queryByText(/Looks great!/)).not.toBeInTheDocument();
  });

  it('renders action element when provided', () => {
    render(
      <StatusBanner
        status="draft"
        action={<button data-testid="action-btn">Continue Application</button>}
      />,
    );

    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    expect(screen.getByText('Continue Application')).toBeInTheDocument();
  });
});
