import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBlocker } from '@tanstack/react-router';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';

const mockReset = vi.fn();
const mockProceed = vi.fn();
let mockBlockerStatus = 'idle';

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(() => ({
    status: mockBlockerStatus,
    reset: mockReset,
    proceed: mockProceed,
  })),
}));

describe('UnsavedChangesGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlockerStatus = 'idle';
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
});
