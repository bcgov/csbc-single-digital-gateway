import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '@ui/components/ui/spinner';

describe('Spinner', () => {
  it('renders with a status role and an accessible loading label', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAccessibleName('Loading');
  });

  it('carries the spinner data-slot and spin animation', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('data-slot', 'spinner');
    // @mdi/react's `spin` prop rotates a nested <g>, rather than the Tailwind `animate-spin` class.
    expect(spinner.querySelector('g')?.getAttribute('style')).toContain('animation');
  });

  it('merges custom classes and forwards props', () => {
    render(<Spinner className="size-8" data-testid="busy" />);

    const spinner = screen.getByTestId('busy');
    expect(spinner).toHaveClass('size-8');
  });
});
