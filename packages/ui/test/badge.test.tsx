import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders its children as a span by default', () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText('New');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveAttribute('data-slot', 'badge');
  });

  it('applies the default variant classes', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-primary');
    expect(badge).toHaveAttribute('data-variant', 'default');
  });

  it('applies the destructive variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge.className).toContain('text-destructive');
    expect(badge).toHaveAttribute('data-variant', 'destructive');
  });

  it('applies the secondary variant classes', () => {
    render(<Badge variant="secondary">Beta</Badge>);
    const badge = screen.getByText('Beta');
    expect(badge.className).toContain('bg-secondary');
  });

  it('renders as a custom element via the render prop', () => {
    render(
      <Badge render={<a href="/tag" />} variant="link">
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
