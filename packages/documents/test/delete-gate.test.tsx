import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeleteGate, type PendingDelete } from '../src/studio/delete-gate';

function renderGate(pending: PendingDelete | null) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(<DeleteGate pending={pending} onConfirm={onConfirm} onCancel={onCancel} />);
  return { user: userEvent.setup(), onConfirm, onCancel, ...view };
}

const FORM: PendingDelete = { id: 'A', kind: 'form', name: 'Details' };
const ELEMENT: PendingDelete = { id: 'e1', kind: 'element', name: 'Age' };
const CONDITION: PendingDelete = { id: 'c1', kind: 'condition', name: 'Eligible?' };

describe('DeleteGate (doc 234 rules 8-9, doc 235 rules 11-13)', () => {
  it('is closed with nothing pending', () => {
    renderGate(null);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks before deleting a page element, naming it (doc 242 rule 4)', async () => {
    const { user, onConfirm } = renderGate(ELEMENT);

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
    expect(dialog).toHaveTextContent('"Age" will be removed from the form.');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledWith('node', false);
  });

  it('asks before deleting a Form, naming it', async () => {
    renderGate(FORM);

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete form?' });
    expect(dialog).toHaveTextContent('"Details" will be removed from the document.');
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('asks a Condition delete whether its branch steps go too: All branches, Condition only, Cancel, stacked', async () => {
    renderGate(CONDITION);

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete condition?' });
    expect(dialog).toHaveTextContent(
      'All branches deletes "Eligible?" and the steps on its branches. Condition only deletes just "Eligible?" and keeps those steps on the canvas, unconnected.',
    );
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['All branches', 'Condition only', 'Cancel']);
    const footer = dialog.querySelector('[data-slot="alert-dialog-footer"]');
    expect(footer).toHaveClass('flex-col', 'sm:flex-col');
    expect(within(dialog).getByRole('button', { name: 'All branches' })).toHaveClass(
      'text-destructive',
      'w-full',
    );
    expect(within(dialog).getByRole('button', { name: 'Condition only' })).toHaveClass(
      'bg-primary',
      'w-full',
    );
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it.each([
    ['Condition only', 'node'],
    ['All branches', 'subtree'],
  ])('confirms a Condition delete from %s', async (button, choice) => {
    const { user, onConfirm } = renderGate(CONDITION);

    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: button }),
    );

    expect(onConfirm).toHaveBeenCalledWith(choice, false);
  });

  it('remembers the Condition button pressed when "Remember my preference" is ticked', async () => {
    const { user, onConfirm } = renderGate(CONDITION);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).queryByRole('checkbox', { name: "Don't ask me again" })).toBeNull();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Remember my preference' }));
    await user.click(within(dialog).getByRole('button', { name: 'Condition only' }));

    expect(onConfirm).toHaveBeenCalledWith('node', true);
  });

  it('confirms with "Don\'t ask me again" unticked by default', async () => {
    const { user, onConfirm, onCancel } = renderGate(FORM);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('checkbox', { name: "Don't ask me again" })).not.toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledWith('node', false);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirms with "Don\'t ask me again" once ticked', async () => {
    const { user, onConfirm } = renderGate(FORM);

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('checkbox', { name: "Don't ask me again" }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledWith('node', true);
  });

  it('cancels from Cancel and from Escape, confirming nothing', async () => {
    const { user, onConfirm, onCancel } = renderGate(FORM);

    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('unticks "Don\'t ask me again" each time it opens for another delete', async () => {
    const { user, rerender, onConfirm, onCancel } = renderGate(FORM);
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('checkbox', {
        name: "Don't ask me again",
      }),
    );

    rerender(<DeleteGate pending={CONDITION} onConfirm={onConfirm} onCancel={onCancel} />);

    expect(
      within(await screen.findByRole('alertdialog', { name: 'Delete condition?' })).getByRole(
        'checkbox',
        { name: 'Remember my preference' },
      ),
    ).not.toBeChecked();
  });
});
