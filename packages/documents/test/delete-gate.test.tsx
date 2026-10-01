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
const CONDITION: PendingDelete = { id: 'c1', kind: 'condition', name: 'Eligible?' };

describe('DeleteGate (doc 234 rules 8-9)', () => {
  it('is closed with nothing pending', () => {
    renderGate(null);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('asks before deleting a Form, naming it', async () => {
    renderGate(FORM);

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete form?' });
    expect(dialog).toHaveTextContent('"Details" will be removed from the document.');
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('says what goes with a Condition: its criteria and the steps only its branches lead to', async () => {
    renderGate(CONDITION);

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete condition?' });
    expect(dialog).toHaveTextContent(
      '"Eligible?", its criteria and any steps only its branches lead to will be removed.',
    );
  });

  it('confirms with "Don\'t ask me again" unticked by default', async () => {
    const { user, onConfirm, onCancel } = renderGate(FORM);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('checkbox', { name: "Don't ask me again" })).not.toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledWith(false);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirms with "Don\'t ask me again" once ticked', async () => {
    const { user, onConfirm } = renderGate(FORM);

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('checkbox', { name: "Don't ask me again" }));
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledWith(true);
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
        { name: "Don't ask me again" },
      ),
    ).not.toBeChecked();
  });
});
