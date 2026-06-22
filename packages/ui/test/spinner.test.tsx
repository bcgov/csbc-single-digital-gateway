import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from '@/components/ui/spinner';

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
    expect(spinner).toHaveClass('animate-spin');
  });

  it('merges custom classes and forwards props', () => {
    render(<Spinner className="size-8" data-testid="busy" />);

    const spinner = screen.getByTestId('busy');
    expect(spinner).toHaveClass('size-8');
    expect(spinner).toHaveClass('animate-spin');
  });
});
