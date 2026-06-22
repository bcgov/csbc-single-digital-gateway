import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from '@/components/ui/scroll-area';

// Base UI ScrollArea relies on layout measurement for scrollbar visibility,
// which jsdom does not provide. These tests stay structural / render-safety.
function TestScrollArea() {
  return (
    <ScrollArea className="h-32 w-48">
      <div>Scrollable content</div>
    </ScrollArea>
  );
}

describe('ScrollArea', () => {
  it('renders its children inside the viewport', () => {
    render(<TestScrollArea />);
    expect(screen.getByText('Scrollable content')).toBeInTheDocument();
  });

  it('renders the scroll-area root and viewport slots', () => {
    const { container } = render(<TestScrollArea />);
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
  });

  it('forwards a className to the root element', () => {
    const { container } = render(<TestScrollArea />);
    expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass('h-32');
  });
});
