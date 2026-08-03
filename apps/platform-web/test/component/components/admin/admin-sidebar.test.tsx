import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

// Mock Link from TanStack Router to prevent routing environment dependency
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, 'aria-label': ariaLabel, title }: any) => (
    <a href={to} aria-label={ariaLabel} title={title}>
      {children}
    </a>
  ),
}));

describe('AdminSidebar', () => {
  it('renders correctly when expanded (collapsed = false)', () => {
    const { container } = render(<AdminSidebar collapsed={false} />);

    const aside = container.querySelector('aside');
    expect(aside).toHaveAttribute('data-collapsed', 'false');

    const bcGovElements = screen.getAllByLabelText('BC Gov');
    expect(bcGovElements).toHaveLength(2);

    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Document Types' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to app' })).toBeInTheDocument();

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Document Types')).toBeInTheDocument();
    expect(screen.getByText('Back to app')).toBeInTheDocument();
  });

  it('renders correctly when collapsed (collapsed = true)', () => {
    const { container } = render(<AdminSidebar collapsed={true} />);

    const aside = container.querySelector('aside');
    expect(aside).toHaveAttribute('data-collapsed', 'true');

    expect(screen.getByText('Overview')).toHaveClass('group-data-[collapsed=true]/rail:hidden');
    expect(screen.getByText('Document Types')).toHaveClass(
      'group-data-[collapsed=true]/rail:hidden',
    );
    expect(screen.getByText('Back to app')).toHaveClass('group-data-[collapsed=true]/rail:hidden');
  });
});
