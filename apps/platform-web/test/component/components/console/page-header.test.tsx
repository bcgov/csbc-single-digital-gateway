import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '@/components/console/page-header';

describe('PageHeader Component Test Suite', () => {
  it('renders the title as a heading and the description on the second line', () => {
    render(<PageHeader title="Services" description="Manage your services" />);

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByText('Manage your services')).toBeInTheDocument();
  });

  it('omits the description line when none is provided', () => {
    const { container } = render(<PageHeader title="Overview" />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the extra items on the right of the title row', () => {
    render(
      <PageHeader
        title="Services"
        extra={[
          <button key="new" type="button">
            New
          </button>,
          <button key="import" type="button">
            Import
          </button>,
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });

  it('always renders the bcgov-gold bottom divider and bleeds to full width', () => {
    const { container } = render(<PageHeader title="X" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer).toHaveClass('border-bcgov-gold');
    // Bleeds past the console main padding so the banner spans the full window width.
    expect(outer.className).toContain('-mx-6');
  });

  it('scales the title via the size prop', () => {
    render(<PageHeader title="Big" size="lg" />);
    expect(screen.getByRole('heading', { name: 'Big' })).toHaveClass('text-2xl');
  });

  it('constrains the content to a centered container by default', () => {
    const { container } = render(<PageHeader title="Contained" />);
    expect(container.querySelector('.max-w-6xl')).toBeInTheDocument();
  });

  it('lets the content span full-width when fluid', () => {
    const { container } = render(<PageHeader title="Wide" fluid />);
    expect(container.querySelector('.max-w-6xl')).toBeNull();
  });
});
