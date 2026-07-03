import { render, screen } from '@testing-library/react';
import { Badge } from '@ui/components/ui/badge';

describe('Badge', () => {
  it('renders its children as a span by default', () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText('New');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });

  it('applies the default color/shape/size classes', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-info-surface');
    expect(badge.className).toContain('rounded-xs');
    expect(badge).toHaveAttribute('data-color', 'blue');
    expect(badge).toHaveAttribute('data-shape', 'rectangular');
    expect(badge).toHaveAttribute('data-size', 'sm');
  });

  it('applies the red color classes', () => {
    render(<Badge color="red">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge.className).toContain('bg-danger-surface');
    expect(badge).toHaveAttribute('data-color', 'red');
  });

  it('applies the yellow color classes', () => {
    render(<Badge color="yellow">Beta</Badge>);
    const badge = screen.getByText('Beta');
    expect(badge.className).toContain('bg-warning-surface');
  });

  it('applies the medium size and rounded shape classes', () => {
    render(
      <Badge size="medium" shape="rounded">
        Large
      </Badge>,
    );
    const badge = screen.getByText('Large');
    expect(badge.className).toContain('h-6');
    expect(badge.className).toContain('rounded-full');
  });

  it('renders as a custom element via the render prop', () => {
    render(
      <Badge render={<a href="/tag" />} color="bc-blue">
        Link badge
      </Badge>,
    );
    const link = screen.getByRole('link', { name: 'Link badge' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/tag');
    expect(link).toHaveAttribute('data-slot', 'badge');
  });

  it('merges a custom className', () => {
    render(<Badge className="custom-badge">Hi</Badge>);
    expect(screen.getByText('Hi')).toHaveClass('custom-badge');
  });
});
