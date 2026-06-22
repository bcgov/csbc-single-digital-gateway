import { render, screen } from '@testing-library/react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

describe('AspectRatio', () => {
  it('renders its children', () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <span>media</span>
      </AspectRatio>,
    );
    expect(screen.getByText('media')).toBeInTheDocument();
  });

  it('sets the --ratio CSS variable from the ratio prop', () => {
    const { container } = render(<AspectRatio ratio={1.5} data-testid="ar" />);
    const el = container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.getPropertyValue('--ratio')).toBe('1.5');
  });

  it('applies the aspect-ratio utility and relative positioning classes', () => {
    const { container } = render(<AspectRatio ratio={4 / 3} />);
    const el = container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
    expect(el).toHaveClass('relative');
    expect(el.className).toContain('aspect-(--ratio)');
  });

  it('merges a custom className', () => {
    const { container } = render(<AspectRatio ratio={1} className="custom-ratio" />);
    const el = container.querySelector('[data-slot="aspect-ratio"]') as HTMLElement;
    expect(el).toHaveClass('custom-ratio');
  });
});
