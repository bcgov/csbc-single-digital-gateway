import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServiceMenu } from '@/components/console/services/service-menu';
import {
  archiveService,
  deleteService,
  discardServiceVersion,
  reactivateService,
} from '@/lib/services';

vi.mock('@/lib/services', () => ({
  archiveService: vi.fn(),
  deleteService: vi.fn(),
  discardServiceVersion: vi.fn(),
  reactivateService: vi.fn(),
}));

vi.mock('@repo/ui/alert-dialog', async (importOriginal) => {
  const original = await importOriginal<typeof import('@repo/ui/alert-dialog')>();
  return {
    ...original,
    AlertDialog: ({ children, open, onOpenChange }: any) => {
      return (
        <>
          {onOpenChange && (
            <div data-testid="mock-alertdialog-helpers">
              <button data-testid="trigger-open-true" onClick={() => onOpenChange(true)}>
                Open True
              </button>
              <button data-testid="trigger-open-false" onClick={() => onOpenChange(false)}>
                Open False
              </button>
            </div>
          )}
          <original.AlertDialog open={open} onOpenChange={onOpenChange}>
            {children}
          </original.AlertDialog>
        </>
      );
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderServiceMenu(props: {
  serviceId?: string;
  versionId?: string;
  canDiscard?: boolean;
  hasSubmissions?: boolean;
  archived?: boolean;
  latestPublished?: boolean;
  onDeleted?: () => void;
  onDiscarded?: () => void;
  onConfirmDestroy?: () => void;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceMenu
        serviceId={props.serviceId ?? 'srv-123'}
        versionId={props.versionId ?? 'v2'}
        canDiscard={props.canDiscard ?? false}
        hasSubmissions={props.hasSubmissions ?? false}
        archived={props.archived ?? false}
        latestPublished={props.latestPublished ?? false}
        onDeleted={props.onDeleted!}
        onDiscarded={props.onDiscarded!}
        onConfirmDestroy={props.onConfirmDestroy!}
      />
    </QueryClientProvider>,
  );
}

describe('ServiceMenu Component Test Suite', () => {
  it('renders dropdown items for unarchived service without discard capability', async () => {
    const user = userEvent.setup();
    renderServiceMenu({ archived: false, canDiscard: false, hasSubmissions: false });

    // Open menu
    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    expect(await screen.findByRole('menuitem', { name: /archive service/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete service/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /discard draft/i })).not.toBeInTheDocument();
  });

  it('renders dropdown items with discard and locked delete for archived, submitted service', async () => {
    const user = userEvent.setup();
    renderServiceMenu({
      archived: true,
      latestPublished: true,
      canDiscard: true,
      hasSubmissions: true,
    });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    expect(await screen.findByRole('menuitem', { name: /discard draft/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /publish service/i })).toBeInTheDocument();

    const deleteItem = screen.getByRole('menuitem', { name: /delete service/i });
    expect(deleteItem).toBeInTheDocument();
    expect(deleteItem).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Has submissions — archive it instead.')).toBeInTheDocument();
  });

  it('renders "Restore" when archived service has not been published', async () => {
    const user = userEvent.setup();
    renderServiceMenu({ archived: true, latestPublished: false });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    expect(await screen.findByRole('menuitem', { name: /restore/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /publish service/i })).not.toBeInTheDocument();
  });

  it('triggers archiveService when clicking Archive service', async () => {
    const user = userEvent.setup();
    vi.mocked(archiveService).mockResolvedValueOnce({} as any);

    renderServiceMenu({ archived: false });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const archiveBtn = await screen.findByRole('menuitem', { name: /archive service/i });
    await user.click(archiveBtn);

    expect(archiveService).toHaveBeenCalledWith('srv-123');
  });

  it('triggers reactivateService when clicking Publish service/Restore', async () => {
    const user = userEvent.setup();
    vi.mocked(reactivateService).mockResolvedValueOnce({} as any);

    renderServiceMenu({ archived: true, latestPublished: false });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const restoreBtn = await screen.findByRole('menuitem', { name: /restore/i });
    await user.click(restoreBtn);

    expect(reactivateService).toHaveBeenCalledWith('srv-123');
  });

  it('handles discard draft dialog cancel and confirm flows', async () => {
    const user = userEvent.setup();
    vi.mocked(discardServiceVersion).mockResolvedValueOnce({} as any);
    const onDiscardedSpy = vi.fn();
    const onConfirmDestroySpy = vi.fn();

    renderServiceMenu({
      canDiscard: true,
      serviceId: 'srv-123',
      versionId: 'v-abc',
      onDiscarded: onDiscardedSpy,
      onConfirmDestroy: onConfirmDestroySpy,
    });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const discardMenuBtn = await screen.findByRole('menuitem', { name: /discard draft/i });
    await user.click(discardMenuBtn);

    // Dialog is open
    expect(await screen.findByRole('heading', { name: 'Discard this draft?' })).toBeInTheDocument();

    // Cancel
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    expect(screen.queryByRole('heading', { name: 'Discard this draft?' })).not.toBeInTheDocument();
    expect(discardServiceVersion).not.toHaveBeenCalled();

    // Reopen and confirm
    await user.click(triggerBtn);
    const reopenDiscardMenuBtn = await screen.findByRole('menuitem', { name: /discard draft/i });
    await user.click(reopenDiscardMenuBtn);
    const confirmBtn = await screen.findByRole('button', { name: 'Discard draft' });
    await user.click(confirmBtn);

    expect(onConfirmDestroySpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(discardServiceVersion).toHaveBeenCalledWith('srv-123', 'v-abc');
    });
    await waitFor(() => {
      expect(onDiscardedSpy).toHaveBeenCalled();
    });
  });

  it('handles delete service confirm flow', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteService).mockResolvedValueOnce({} as any);
    const onDeletedSpy = vi.fn();
    const onConfirmDestroySpy = vi.fn();

    renderServiceMenu({
      hasSubmissions: false,
      serviceId: 'srv-123',
      onDeleted: onDeletedSpy,
      onConfirmDestroy: onConfirmDestroySpy,
    });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const deleteMenuBtn = await screen.findByRole('menuitem', { name: /delete service/i });
    await user.click(deleteMenuBtn);

    // Dialog is open
    expect(
      await screen.findByRole('heading', { name: 'Delete this service?' }),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    expect(onConfirmDestroySpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(deleteService).toHaveBeenCalledWith('srv-123');
    });
    await waitFor(() => {
      expect(onDeletedSpy).toHaveBeenCalled();
    });
  });

  it('shows error messages in dialog when deletion fails', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteService).mockRejectedValueOnce(new Error('Internal Database Error'));

    renderServiceMenu({ hasSubmissions: false, serviceId: 'srv-123' });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const deleteMenuBtn = await screen.findByRole('menuitem', { name: /delete service/i });
    await user.click(deleteMenuBtn);

    const confirmBtn = await screen.findByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Internal Database Error');
  });

  it('does not crash when optional callbacks onDeleted, onDiscarded, and onConfirmDestroy are omitted', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteService).mockResolvedValueOnce({} as any);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <ServiceMenu
          serviceId="srv-123"
          hasSubmissions={false}
          archived={false}
          latestPublished={false}
        />
      </QueryClientProvider>,
    );

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const deleteMenuBtn = await screen.findByRole('menuitem', { name: /delete service/i });
    await user.click(deleteMenuBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteService).toHaveBeenCalledWith('srv-123');
    });
  });

  it('shows error messages in dialog when discard draft fails', async () => {
    const user = userEvent.setup();
    vi.mocked(discardServiceVersion).mockRejectedValueOnce(
      new Error('Discard failed due to locks'),
    );

    renderServiceMenu({ canDiscard: true, serviceId: 'srv-123', versionId: 'v2' });

    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const discardMenuBtn = await screen.findByRole('menuitem', { name: /discard draft/i });
    await user.click(discardMenuBtn);

    const confirmBtn = await screen.findByRole('button', { name: 'Discard draft' });
    await user.click(confirmBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Discard failed due to locks');
  });

  it('does not close dialog when AlertDialog triggers onOpenChange(true)', async () => {
    const user = userEvent.setup();
    renderServiceMenu({ archived: false, canDiscard: false, hasSubmissions: false });

    // Open menu and select delete to open the dialog
    const triggerBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(triggerBtn);

    const deleteMenuBtn = await screen.findByRole('menuitem', { name: /delete service/i });
    await user.click(deleteMenuBtn);

    const triggerOpenTrueBtn = screen.getByTestId('trigger-open-true');
    await user.click(triggerOpenTrueBtn);

    // Dialog should still be open
    expect(screen.getByRole('heading', { name: 'Delete this service?' })).toBeInTheDocument();
  });
});
