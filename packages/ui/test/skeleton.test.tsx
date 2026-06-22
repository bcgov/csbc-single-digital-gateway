import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders a div carrying the skeleton data-slot', () => {
    render(<Skeleton data-testid="skel" />);

    const skel = screen.getByTestId('skel');
    expect(skel).toBeInTheDocument();
    expect(skel).toHaveAttribute('data-slot', 'skeleton');
  });

  it('applies the pulse animation styling and merges custom classes', () => {
    render(<Skeleton data-testid="skel" className="h-8 w-32" />);

    const skel = screen.getByTestId('skel');
    expect(skel).toHaveClass('animate-pulse');
    expect(skel).toHaveClass('h-8', 'w-32');
  });

  it('forwards arbitrary props and children', () => {
    render(
      <Skeleton data-testid="skel" aria-hidden="true">
        <span>placeholder</span>
      </Skeleton>,
    );

    const skel = screen.getByTestId('skel');
    expect(skel).toHaveAttribute('aria-hidden', 'true');
    expect(skel).toHaveTextContent('placeholder');
  });
});
