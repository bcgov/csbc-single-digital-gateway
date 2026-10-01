import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { StudioPanel } from '../src/studio/studio-panel';

function Harness({ initial = false }: { initial?: boolean }) {
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
});
