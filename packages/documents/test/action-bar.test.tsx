import { mdiContentCopy, mdiDeleteOutline } from '@mdi/js';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionBar, ActionBarButton } from '../src/renderers/studio/action-bar';
import { ElementActions } from '../src/renderers/studio/element-actions';
import { NodeActions } from '../src/studio/node-actions';

function renderBar(onCopy = vi.fn(), onDelete = vi.fn(), onElementClick = vi.fn()) {
  const view = render(
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- the element a click must not reach
    <div data-testid="element" onClick={onElementClick}>
      <ActionBar slot="test-actions" label="Element actions">
        <ActionBarButton label="Copy Age" icon={mdiContentCopy} onClick={onCopy} />
        <ActionBarButton
          label="Delete Age"
          icon={mdiDeleteOutline}
          destructive
          onClick={onDelete}
        />
      </ActionBar>
    </div>,
  );
  return { ...view, onCopy, onDelete, onElementClick };
}

const bar = (container: HTMLElement, slot = 'test-actions') =>
  container.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;

describe('ActionBar (doc 254 rules 1-5)', () => {
  it('draws a popover-style panel of joined 24px ghost buttons with 14px icons', () => {
    const { container } = renderBar();
    const panel = bar(container).querySelector('[data-slot="action-bar"]')!;
    expect(panel).toHaveClass('rounded-lg', 'bg-popover', 'p-0.5', 'shadow-md', 'ring-1');
    const group = within(panel as HTMLElement).getByRole('group', { name: 'Element actions' });
    expect(group).toHaveAttribute('data-variant', 'joined');
    for (const button of within(group).getAllByRole('button')) {
      // `icon-xs` is 24px.
      expect(button).toHaveClass('size-6');
      expect(button.querySelector('svg')).toHaveStyle({ width: '14px' });
    }
  });

  it('colours a destructive button and keeps each button named with a tooltip', async () => {
    const { onDelete, onElementClick } = renderBar();
    const remove = screen.getByRole('button', { name: 'Delete Age' });
    expect(remove).toHaveClass('text-destructive');
    expect(screen.getByRole('button', { name: 'Copy Age' })).not.toHaveClass('text-destructive');
    expect(remove).toHaveAttribute('title', 'Delete Age');
    await userEvent.setup().click(remove);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onElementClick).not.toHaveBeenCalled();
  });

  it('sits 8px below the bottom-right corner, inline (never portalled)', () => {
    const { container } = renderBar();
    expect(bar(container)).toHaveClass('absolute', 'top-full', 'right-0', 'pt-2');
    expect(screen.getByTestId('element').contains(bar(container))).toBe(true);
  });

  it('is shared by the element row and the node row', () => {
    const element = render(<ElementActions name="Age" onCopy={vi.fn()} onDelete={vi.fn()} />);
    const elementRow = bar(element.container, 'studio-element-actions');
    expect(elementRow.querySelector('[data-slot="action-bar"]')).not.toBeNull();
    expect(
      within(elementRow)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Copy Age', 'Delete Age']);
    element.unmount();
    const node = render(<NodeActions name="Details" onEdit={vi.fn()} onDelete={vi.fn()} />);
    const nodeRow = bar(node.container, 'document-studio-node-actions');
    expect(nodeRow.querySelector('[data-slot="action-bar"]')).not.toBeNull();
    for (const button of within(nodeRow).getAllByRole('button'))
      expect(button).toHaveClass('nodrag', 'nopan');
  });
});
