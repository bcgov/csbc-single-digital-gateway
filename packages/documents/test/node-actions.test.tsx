import { mdiCogOutline, mdiDeleteOutline, mdiTextBoxEditOutline } from '@mdi/js';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NodeActions } from '../src/studio/node-actions';

const row = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="document-studio-node-actions"]')!;
const iconOf = (button: HTMLElement) => button.querySelector('svg path')?.getAttribute('d');

describe('NodeActions (doc 234)', () => {
  it("draws a Form's Edit, Inspect and Delete in that order, each named for the node (rule 3)", async () => {
    const onEdit = vi.fn();
    const onInspect = vi.fn();
    const onDelete = vi.fn();
    const { container } = render(
      <NodeActions name="Details" onEdit={onEdit} onInspect={onInspect} onDelete={onDelete} />,
    );

    const buttons = within(row(container)).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Edit Details',
      'Inspect Details',
      'Delete Details',
    ]);
    expect(buttons.map(iconOf)).toEqual([mdiTextBoxEditOutline, mdiCogOutline, mdiDeleteOutline]);
    for (const button of buttons)
      // The shared action bar's 24px ghost buttons (doc 254 rule 1).
      expect(button).toHaveClass('nodrag', 'nopan', 'size-6');

    const user = userEvent.setup();
    const [edit, inspect, remove] = buttons;
    await user.click(edit!);
    await user.click(inspect!);
    await user.click(remove!);
    expect([onEdit, onInspect, onDelete].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('draws only Edit and Delete without an inspect action — a Condition (rule 3)', () => {
    const { container } = render(
      <NodeActions name="Eligible?" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(
      within(row(container))
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Edit Eligible?', 'Delete Eligible?']);
  });

  it('sits outside the card below its right edge, padded so the pointer can cross to it (rule 1)', () => {
    const { container } = render(<NodeActions name="A" onEdit={vi.fn()} onDelete={vi.fn()} />);

    // 8px clear of the card (doc 254 rule 2); the buttons are joined in the bar's group.
    expect(row(container)).toHaveClass('absolute', 'top-full', 'right-0', 'pt-2');
    expect(row(container).querySelector('[data-slot="button-group"]')).not.toBeNull();
  });

  it('is hidden until the node is hovered or focused within, and stays named while hidden (rule 2)', () => {
    const { container } = render(<NodeActions name="A" onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(row(container)).not.toHaveAttribute('data-shown');
    expect(row(container)).toHaveClass(
      'pointer-events-none',
      'opacity-0',
      'group-hover/node:pointer-events-auto',
      'group-hover/node:opacity-100',
      'group-focus-within/node:pointer-events-auto',
      'group-focus-within/node:opacity-100',
    );
    expect(screen.getByRole('button', { name: 'Delete A' })).toBeInTheDocument();
  });

  it('is shown while its node is selected (rule 2)', () => {
    const { container } = render(
      <NodeActions name="A" shown onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(row(container)).toHaveAttribute('data-shown');
    expect(row(container)).toHaveClass(
      'data-[shown]:pointer-events-auto',
      'data-[shown]:opacity-100',
    );
  });
});
