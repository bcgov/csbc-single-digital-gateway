import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlocker } from '@tanstack/react-router';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';

const mockReset = vi.fn();
const mockProceed = vi.fn();
let mockBlockerStatus = 'idle';
let mockHasReset = true;
let mockHasProceed = true;

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(() => ({
    status: mockBlockerStatus,
    reset: mockHasReset ? mockReset : undefined,
    proceed: mockHasProceed ? mockProceed : undefined,
  })),
}));

let capturedOnOpenChange: any = null;
vi.mock('@repo/ui/alert-dialog', async (importOriginal) => {
  const original = await importOriginal<typeof import('@repo/ui/alert-dialog')>();
  return {
    ...original,
    AlertDialog: ({ children, open, onOpenChange }: any) => {
      capturedOnOpenChange = onOpenChange;
      // If original.AlertDialog is not functional/rendered properly in JSDOM tests due to Radix portals,
      // fallback to custom div, but original.AlertDialog is preferred if it works.
      return original.AlertDialog ? (
        <original.AlertDialog open={open} onOpenChange={onOpenChange}>
          {children}
        </original.AlertDialog>
      ) : (
        <div data-testid="mock-alert-dialog">{children}</div>
      );
    },
  };
});

describe('UnsavedChangesGuard Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlockerStatus = 'idle';
    mockHasReset = true;
    mockHasProceed = true;
    capturedOnOpenChange = null;
  });

  it('registers blocker and does not show dialog when blocker status is idle', () => {
    mockBlockerStatus = 'idle';
    render(<UnsavedChangesGuard when={true} />);

    // Verify useBlocker registration
    expect(useBlocker).toHaveBeenCalledWith(
      expect.objectContaining({
        withResolver: true,
      }),
    );

    // Verify shouldBlockFn logic from input arguments
    const callArgs = vi.mocked(useBlocker).mock.calls[0]?.[0] as any;
    expect(callArgs?.shouldBlockFn()).toBe(true);
    expect(callArgs?.enableBeforeUnload()).toBe(true);

    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('renders confirmation dialog when blocker status is blocked', () => {
    mockBlockerStatus = 'blocked';
    render(<UnsavedChangesGuard when={true} />);

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(
      screen.getByText('Your changes haven’t been saved and will be lost if you leave this page.'),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
  });

  it('calls reset when Keep editing is clicked', async () => {
    const user = userEvent.setup();
    mockBlockerStatus = 'blocked';
    render(<UnsavedChangesGuard when={true} />);

    const cancelBtn = screen.getByRole('button', { name: 'Keep editing' });
    await user.click(cancelBtn);

    expect(mockReset).toHaveBeenCalled();
  });

  it('calls proceed when Discard changes is clicked', async () => {
    const user = userEvent.setup();
    mockBlockerStatus = 'blocked';
    render(<UnsavedChangesGuard when={true} />);

    const proceedBtn = screen.getByRole('button', { name: 'Discard changes' });
    await user.click(proceedBtn);

    expect(mockProceed).toHaveBeenCalledTimes(1);
  });

  it('registers blocker correctly when "when" is false', () => {
    render(<UnsavedChangesGuard when={false} />);
    const callArgs = vi.mocked(useBlocker).mock.calls[0]?.[0] as any;
    expect(callArgs?.shouldBlockFn()).toBe(false);
    expect(callArgs?.enableBeforeUnload()).toBe(false);
  });

  it('calls blocker.reset in onOpenChange when open is false', () => {
    mockBlockerStatus = 'blocked';
    render(<UnsavedChangesGuard when={true} />);

    expect(capturedOnOpenChange).toBeInstanceOf(Function);

    // Call with true - should do nothing
    capturedOnOpenChange(true);
    expect(mockReset).not.toHaveBeenCalled();

    // Call with false - should call blocker.reset
    capturedOnOpenChange(false);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('handles onOpenChange(false) safely when blocker.reset is undefined', () => {
    mockBlockerStatus = 'blocked';
    mockHasReset = false; // Mock blocker.reset as undefined
    render(<UnsavedChangesGuard when={true} />);

    expect(capturedOnOpenChange).toBeInstanceOf(Function);
    expect(() => capturedOnOpenChange(false)).not.toThrow();
  });

  it('handles Keep editing click safely when blocker.reset is undefined', async () => {
    const user = userEvent.setup();
    mockBlockerStatus = 'blocked';
    mockHasReset = false; // Mock blocker.reset as undefined
    render(<UnsavedChangesGuard when={true} />);

    const cancelBtn = screen.getByRole('button', { name: 'Keep editing' });
    await expect(user.click(cancelBtn)).resolves.not.toThrow();
  });

  it('handles Discard changes click safely when blocker.proceed is undefined', async () => {
    const user = userEvent.setup();
    mockBlockerStatus = 'blocked';
    mockHasProceed = false; // Mock blocker.proceed as undefined
    render(<UnsavedChangesGuard when={true} />);

    const proceedBtn = screen.getByRole('button', { name: 'Discard changes' });
    await expect(user.click(proceedBtn)).resolves.not.toThrow();
  });
});

/**
 * Feature 177 — the save path. Additive: `when` still accepts a boolean and, without `onSave`, the
 * dialog is exactly the two-action one its three existing call sites rely on.
 */
/** A stable predicate, so re-rendering the guard with it must not re-register the blocker. */
const alwaysDirty = () => true;

describe('UnsavedChangesGuard — save action (feature 177)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlockerStatus = 'blocked';
    mockHasReset = true;
    mockHasProceed = true;
    capturedOnOpenChange = null;
  });

  it('renders no Save action when onSave is omitted', () => {
    render(<UnsavedChangesGuard when={true} />);

    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('offers Discard changes and Save changes, with Keep editing as the dismissal', () => {
    render(<UnsavedChangesGuard when={true} onSave={vi.fn().mockResolvedValue(undefined)} />);

    // Only two footer buttons — three overflow the dialog's max-width. Cancelling is the close
    // control, which carries the same accessible name it always did.
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument();
  });

  it('keeps the two-button shape (Keep editing + Discard) when there is no save to offer', () => {
    render(<UnsavedChangesGuard when={true} />);

    // The three pages that render this shape must not change: a solid destructive Discard beside
    // an explicit Keep editing, and no close control competing with it for the same name.
    expect(screen.getByRole('button', { name: 'Discard changes' })).toHaveClass('bg-destructive');
    expect(screen.getAllByRole('button', { name: 'Keep editing' })).toHaveLength(1);
  });

  it('awaits onSave then proceeds with the blocked navigation', async () => {
    const user = userEvent.setup();
    const order: string[] = [];
    const onSave = vi.fn(async () => {
      order.push('save');
    });
    mockProceed.mockImplementation(() => order.push('proceed'));
    render(<UnsavedChangesGuard when={true} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockProceed).toHaveBeenCalledTimes(1));
    // Order matters: proceeding first would navigate away mid-save.
    expect(order).toEqual(['save', 'proceed']);
  });

  it('keeps the dialog open and shows the error when onSave rejects', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Version is no longer a draft'));
    render(<UnsavedChangesGuard when={true} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Version is no longer a draft');
    expect(mockProceed).not.toHaveBeenCalled();
    // Still blocked, still offering every way out.
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('disables Save and shows the reason when saveDisabled is true', () => {
    render(
      <UnsavedChangesGuard
        when={true}
        onSave={vi.fn().mockResolvedValue(undefined)}
        saveDisabled={true}
        saveDisabledReason="This step has a validation error."
      />,
    );

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByText('This step has a validation error.')).toBeInTheDocument();
  });

  it('still discards while Save is disabled', async () => {
    const user = userEvent.setup();
    render(
      <UnsavedChangesGuard
        when={true}
        onSave={vi.fn().mockResolvedValue(undefined)}
        saveDisabled={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(mockProceed).toHaveBeenCalledTimes(1);
  });

  it('still cancels while Save is disabled', async () => {
    const user = userEvent.setup();
    render(
      <UnsavedChangesGuard
        when={true}
        onSave={vi.fn().mockResolvedValue(undefined)}
        saveDisabled={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(mockReset).toHaveBeenCalled();
    expect(mockProceed).not.toHaveBeenCalled();
  });

  it('reads a function `when` at block time rather than capturing it at render time', () => {
    // The race this exists for: a save clears the flag in an async continuation, and the navigation
    // that follows must see the CURRENT value, not the one captured when the guard last rendered.
    let dirty = true;
    render(<UnsavedChangesGuard when={() => dirty} />);

    const callArgs = vi.mocked(useBlocker).mock.calls[0]?.[0] as any;
    expect(callArgs?.shouldBlockFn()).toBe(true);

    dirty = false;
    expect(callArgs?.shouldBlockFn()).toBe(false);
    expect(callArgs?.enableBeforeUnload()).toBe(false);
  });

  it('registers the blocker once for a function `when`, not per keystroke', () => {
    const { rerender } = render(<UnsavedChangesGuard when={alwaysDirty} />);
    const first = (vi.mocked(useBlocker).mock.calls[0]?.[0] as any)?.shouldBlockFn;

    rerender(<UnsavedChangesGuard when={alwaysDirty} />);

    const calls = vi.mocked(useBlocker).mock.calls;
    // Same memoized predicate every render — a stable `when` never re-registers the blocker.
    expect((calls.at(-1)?.[0] as any)?.shouldBlockFn).toBe(first);
  });
});
