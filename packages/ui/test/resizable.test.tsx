import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@ui/components/ui/resizable';

// react-resizable-panels relies on real layout measurement, which jsdom does
// not provide. These tests stay at render-safety + accessibility level.
function TestResizable() {
  return (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize={50}>
        <div>Left panel</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div>Right panel</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

describe('Resizable', () => {
  it('renders the panel group with its child panels', () => {
    render(<TestResizable />);
    expect(screen.getByText('Left panel')).toBeInTheDocument();
    expect(screen.getByText('Right panel')).toBeInTheDocument();
  });

  it('exposes the handle with a separator role', () => {
    render(<TestResizable />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders the panel group data-slot wrapper', () => {
    const { container } = render(<TestResizable />);
    expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeInTheDocument();
  });
});
