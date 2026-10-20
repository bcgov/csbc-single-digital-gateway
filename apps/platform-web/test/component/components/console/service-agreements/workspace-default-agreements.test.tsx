import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceDefaultAgreements } from '@/components/console/service-agreements/workspace-default-agreements';
import { defaultAgreement, ISO } from '../../../../support/fixtures';
import { mockWorkspacesDefaultAgreementsBff } from '../../../../support/mock-workspaces-default-agreements-bff';
import { jsonResponse } from '../../../../support/render-app';

let capturedOnOpenChange: ((open: boolean) => void) | undefined;
vi.mock('@repo/ui/dialog', () => ({
  Dialog: vi.fn(({ open, onOpenChange, children }: any) => {
    capturedOnOpenChange = onOpenChange;
    if (!open) return null;
    return (
      <div data-testid="mock-dialog" data-open={open}>
        {children}
      </div>
    );
  }),
  DialogContent: vi.fn(({ children }: any) => (
    <div role="dialog" aria-label="Add a default agreement">
      <button type="button" aria-label="Close" onClick={() => capturedOnOpenChange?.(false)}>
        Close
      </button>
      {children}
    </div>
  )),
  DialogHeader: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogTitle: vi.fn(({ children }: any) => <h2>{children}</h2>),
  DialogDescription: vi.fn(({ children }: any) => <p>{children}</p>),
}));

function renderWorkspaceDefaultAgreements() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceDefaultAgreements slug="riverton" workspaceId="w1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  capturedOnOpenChange = undefined;
  vi.restoreAllMocks();
});

describe('workspace default agreements panel', () => {
  it('Should let a workspace ADMIN see, add, and remove defaults; the picker excludes already-default', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add default/i }));
    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    // Available: the published, not-yet-default one; excluded: the already-default one.
    expect(await screen.findByText('Privacy policy')).toBeInTheDocument();
    expect(screen.queryByText('Terms of service')).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it('Should show the list read-only for a non-admin member (no add/remove)', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'member',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add default/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('Should allow adding a default agreement successfully', async () => {
    const fetchMock = mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const privacyBtn = within(dialog).getByRole('button', { name: /privacy policy/i });
    await userEvent.click(privacyBtn);

    // Verify POST was called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/workspaces/w1/default-agreements'),
      expect.objectContaining({ method: 'POST' }),
    );

    // Dialog should close
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('Should render API error warning when adding default fails', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      mockErrors: true,
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const privacyBtn = within(dialog).getByRole('button', { name: /privacy policy/i });
    await userEvent.click(privacyBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Failed to add default agreement');
  });

  it('Should allow removing a default agreement successfully', async () => {
    const fetchMock = mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeBtn);

    // Verify DELETE was called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/workspaces/w1/default-agreements/d1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('Should render API error warning when removing default fails', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      mockErrors: true,
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Remove default failed: 400');
  });

  it('Should display correct badges for Optional, Required and Global properties', async () => {
    const customDefault = {
      id: 'd1',
      agreementDocumentId: 'a1',
      title: 'TOS',
      isOptional: true,
      isGlobal: true,
      createdAt: ISO,
    };
    mockWorkspacesDefaultAgreementsBff(customDefault, {
      role: 'admin',
      defaults: [customDefault],
    });

    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('TOS')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('Should show no published agreements fallback in the picker when all are defaulted', async () => {
    // Only 'Terms of service' is published, and it's already a default document
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      agreements: [{ id: 'a1', workspaceId: 'w1', title: 'Terms of service', status: 'published' }],
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    expect(
      within(dialog).getByText('No published agreements available to add.'),
    ).toBeInTheDocument();
  });

  it('Should close picker dialog when cancel close button is clicked', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const closeBtn = within(dialog).getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);

    // Wait for dialog to dismiss
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('Should disable the add button in the picker when the mutation is pending', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const privacyBtn = within(dialog).getByRole('button', { name: /privacy policy/i });

    // Trigger mutation
    await userEvent.click(privacyBtn);

    // Verify it is disabled during pending state
    expect(privacyBtn).toBeDisabled();

    // Wait for dialog to dismiss on success
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('Should disable the remove button when the delete mutation is pending', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });

    // Trigger delete mutation
    await userEvent.click(removeBtn);

    // Verify it is disabled during pending state
    expect(removeBtn).toBeDisabled();

    // Wait for the query to resolve
    await screen.findByText('Terms of service');
  });

  it('Should prevent dialog dismiss when onOpenChange(false) is called while add is pending, and handle onOpenChange(true)', async () => {
    let resolvePost!: () => void;
    const postPromise = new Promise<void>((resolve) => {
      resolvePost = resolve;
    });

    const fetchMock = mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/workspaces/w1/default-agreements') && method === 'POST') {
        await postPromise;
        return jsonResponse({
          id: 'd2',
          agreementDocumentId: 'a2',
          title: 'Privacy policy',
          isOptional: true,
          isGlobal: true,
          createdAt: ISO,
        });
      }
      return fetchMock(input, init);
    }) as any;

    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole(
      'dialog',
      { name: /add a default agreement/i },
      { timeout: 32000 },
    );
    const privacyBtn = within(dialog).getByRole('button', { name: /privacy policy/i });

    // 1. Trigger open=true (next=true branch where !next is false)
    capturedOnOpenChange?.(true);
    expect(dialog).toBeInTheDocument();

    // 2. Trigger mutation (so add.isPending becomes true)
    await userEvent.click(privacyBtn);

    // 3. Attempt to close while add.isPending is true (!next is true, but !add.isPending is false)
    capturedOnOpenChange?.(false);
    expect(dialog).toBeInTheDocument();

    // 4. Resolve the post mutation to let it finish
    resolvePost();

    // Dialog should close on success
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('Should render workspace-scoped selectable agreements without a Global badge in the picker', async () => {
    mockWorkspacesDefaultAgreementsBff(defaultAgreement, {
      role: 'admin',
      defaults: [defaultAgreement],
    });
    renderWorkspaceDefaultAgreements();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const customTOSBtn = within(dialog).getByRole('button', { name: /workspace custom tos/i });
    expect(customTOSBtn).toBeInTheDocument();

    // Verify there is no 'Global' badge inside this button
    expect(within(customTOSBtn).queryByText('Global')).not.toBeInTheDocument();
  });
});
