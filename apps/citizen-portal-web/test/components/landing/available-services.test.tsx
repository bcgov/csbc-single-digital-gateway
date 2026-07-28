import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AvailableServices } from '@/components/landing/available-services';
import type { CatalogService } from '@/lib/catalog';

// Mock Link from @tanstack/react-router to avoid setting up a router in this simple component test
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, hash, params, ...props }: any) => {
    let href = hash ? `${to}#${hash}` : to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe('AvailableServices Component', () => {
  const mockServices: CatalogService[] = [
    {
      id: 'svc-1',
      title: 'Income Assistance',
      description: 'Support for low-income individuals.',
    },
    {
      id: 'svc-2',
      title: 'Child Care Benefit',
      description: 'Funding help for child care costs.',
    },
  ];

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<AvailableServices services={mockServices} loading={true} />);

    // Renders skeletons
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Should not render service details
    expect(screen.queryByText('Income Assistance')).not.toBeInTheDocument();
  });

  it('renders services and descriptions when no applications exist', () => {
    render(<AvailableServices services={mockServices} loading={false} />);

    // Service titles and links
    const link1 = screen.getByRole('link', { name: /Income Assistance/i });
    expect(link1).toBeInTheDocument();
    expect(link1).toHaveAttribute('href', '/services/svc-1');

    const link2 = screen.getByRole('link', { name: /Child Care Benefit/i });
    expect(link2).toBeInTheDocument();
    expect(link2).toHaveAttribute('href', '/services/svc-2');

    // Service descriptions are rendered
    expect(screen.getByText('Support for low-income individuals.')).toBeInTheDocument();
    expect(screen.getByText('Funding help for child care costs.')).toBeInTheDocument();

    // No open link or badges
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
  });
});
