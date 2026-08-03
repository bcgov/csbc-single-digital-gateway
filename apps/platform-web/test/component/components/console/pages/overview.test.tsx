import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewPage } from '@/components/console/pages/overview';

describe('OverviewPage Component Test Suite', () => {
  it('renders the placeholder message correctly', () => {
    render(<OverviewPage />);

    expect(
      screen.getByText(
        'Overview is being set up — placeholder layout shown until you choose what to track.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the skeleton nodes in the placeholder dashboard layout', () => {
    const { container } = render(<OverviewPage />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    // Verify that the multiple mock skeleton sections are successfully injected
    expect(skeletons.length).toBeGreaterThan(30);
  });
});
