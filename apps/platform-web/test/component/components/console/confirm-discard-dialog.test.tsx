import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDiscardDialog } from '@/components/console/confirm-discard-dialog';

// Doc 218 rule 19 — the question `UnsavedChangesGuard` asks for a navigation, asked for something the guard
// cannot see: an in-page version switch, which changes no route.

describe('ConfirmDiscardDialog (doc 218 rule 19)', () => {
  it('renders nothing while closed', () => {
    render(<ConfirmDiscardDialog open={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it('asks, and discards only on the affirmative action', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDiscardDialog open onCancel={onCancel} onConfirm={onConfirm} />);
    const user = userEvent.setup();

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps the edits when Keep editing is chosen', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDiscardDialog open onCancel={onCancel} onConfirm={onConfirm} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('treats a dismissal as Keep editing, never as a discard', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDiscardDialog open onCancel={onCancel} onConfirm={onConfirm} />);
    const user = userEvent.setup();

    // Base UI's alert dialog disables backdrop dismissal, so Escape is the route — and it must not be a shortcut
    // to losing work.
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
