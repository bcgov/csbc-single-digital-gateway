import { act, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it } from 'vitest';
import { Toaster } from '@ui/components/ui/sonner';

// Sonner is jsdom-hostile: it renders its toast region lazily into a portal. These
// are pragmatic render-safety / structural checks rather than full toast-lifecycle
// behavioral tests.

function renderToaster() {
  return render(<Toaster />);
}

describe('Toaster (render-safety)', () => {
  it('exports the Toaster as a component', () => {
    expect(typeof Toaster).toBe('function');
  });

  it('mounts within a theme provider without throwing', () => {
    expect(() => renderToaster()).not.toThrow();
  });

  it('renders a fired toast message into the document', async () => {
    renderToaster();

    act(() => {
      toast('Saved successfully');
    });

    expect(await screen.findByText('Saved successfully')).toBeInTheDocument();
  });
});
