import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from '@ui/components/ui/separator';

describe('Separator', () => {
  it('renders with a separator role by default', () => {
    render(<Separator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('defaults to horizontal orientation', () => {
    render(<Separator data-testid="sep" />);
    const separator = screen.getByTestId('sep');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('reflects a vertical orientation when requested', () => {
    render(<Separator orientation="vertical" data-testid="sep" />);
    const separator = screen.getByTestId('sep');
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  it('forwards arbitrary props such as className', () => {
    render(<Separator className="my-divider" data-testid="sep" />);
    expect(screen.getByTestId('sep')).toHaveClass('my-divider');
  });
});
