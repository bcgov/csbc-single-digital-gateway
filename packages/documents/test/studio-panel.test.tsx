import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudioPanel } from '../src/studio/studio-panel';

function Harness({ initial = false, revealKey }: { initial?: boolean; revealKey?: number }) {
  const [open, setOpen] = useState(initial);
  return (
    <StudioPanel
      label="Inspector"
      title="Inspector"
      icon="M0 0"
      side="right"
      width="w-80"
      actions={<button type="button">View</button>}
      open={open}
      onOpenChange={setOpen}
      slot="panel"
      revealKey={revealKey}
    >
      <p>body</p>
    </StudioPanel>
  );
}

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('StudioPanel', () => {
  it('docks at the canvas breakpoint and up, and is an icon button below it', () => {
    const { container } = render(<Harness />);

    expect(slot(container, 'panel')).toHaveClass(
      'absolute',
      'top-3',
      'right-3',
      'w-80',
      '@max-[64rem]/canvas:hidden',
    );
    expect(screen.getByRole('button', { name: 'Open inspector' })).toHaveClass(
      '@min-[64rem]/canvas:hidden',
      'right-3',
    );
    expect(slot(container, 'panel-expanded')).toBeNull();
  });

  it('titles its heading in semibold', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Inspector' })).toHaveClass('font-semibold');
  });

  it('opens over most of the canvas from its icon, with a close button at the right of the heading', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Open inspector' }));

    const expanded = slot(container, 'panel-expanded')!;
    expect(expanded).toHaveClass('absolute', 'inset-3', '@min-[64rem]/canvas:hidden');
    expect(screen.getByRole('button', { name: 'Open inspector' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const heading = within(expanded).getByRole('banner');
    const buttons = within(heading).getAllByRole('button');
    expect(buttons.at(-1)).toHaveAccessibleName('Close inspector');
    expect(within(expanded).getByText('body')).toBeInTheDocument();

    await user.click(within(expanded).getByRole('button', { name: 'Close inspector' }));
    expect(slot(container, 'panel-expanded')).toBeNull();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial />);

    within(slot(container, 'panel-expanded')!)
      .getByRole('button', { name: 'Close inspector' })
      .focus();
    await user.keyboard('{Escape}');

    expect(slot(container, 'panel-expanded')).toBeNull();
  });

  describe('reveal (doc 234 rule 7)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('does nothing on mount, whatever the key', () => {
      const { container } = render(<Harness revealKey={3} />);

      expect(slot(container, 'panel-expanded')).toBeNull();
      expect(document.body).toHaveFocus();
    });

    it('opens a collapsed panel expanded and focuses it when the key changes', async () => {
      // jsdom lays nothing out: the docked panel has no client rects, as when it is display:none.
      const { container, rerender } = render(<Harness revealKey={0} />);

      rerender(<Harness revealKey={1} />);

      const expanded = slot(container, 'panel-expanded');
      expect(expanded).not.toBeNull();
      await waitFor(() => expect(expanded).toHaveFocus());
    });

    it('focuses a docked panel in place, never opening the expanded one', async () => {
      const { container, rerender } = render(<Harness revealKey={0} />);
      const docked = slot(container, 'panel')!;
      vi.spyOn(docked, 'getClientRects').mockReturnValue([new DOMRect(0, 0, 320, 400)] as never);

      rerender(<Harness revealKey={1} />);

      await waitFor(() => expect(docked).toHaveFocus());
      expect(slot(container, 'panel-expanded')).toBeNull();
    });
  });
});
