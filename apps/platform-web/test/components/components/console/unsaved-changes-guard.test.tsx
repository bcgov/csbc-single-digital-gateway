import { render, screen } from '@testing-library/react';
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
