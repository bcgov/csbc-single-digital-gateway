import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportsPage } from '@/components/console/pages/reports';

describe('ReportsPage', () => {
  it('renders the toolbar and empty state information correctly', () => {
    render(<ReportsPage />);

    expect(screen.getByText('Saved reports for this workspace')).toBeInTheDocument();
    expect(screen.getByText('No saved reports yet')).toBeInTheDocument();
    expect(screen.getByText('Reports you save will appear here.')).toBeInTheDocument();
  });
});
