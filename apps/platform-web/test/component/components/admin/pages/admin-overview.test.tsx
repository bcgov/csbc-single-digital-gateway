import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminOverview } from '@/components/admin/pages/admin-overview';

describe('AdminOverview', () => {
  it('renders the placeholder message correctly', () => {
    render(<AdminOverview />);

    expect(
      screen.getByText('Platform administration — the admin overview is being set up.'),
    ).toBeInTheDocument();
  });
});
