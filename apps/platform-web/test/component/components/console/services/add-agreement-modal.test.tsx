import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddAgreementModal } from '@/components/console/services/add-agreement-modal';
import { attachServiceAgreement } from '@/lib/services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAgreements = [
  { id: 'a1', title: 'Global Privacy Policy', status: 'published', isGlobal: true },
  { id: 'a2', title: 'Workspace Draft TOS', status: 'draft', isGlobal: false },
  { id: 'a3', title: 'Workspace Published TOS', status: 'published', isGlobal: false },
];

vi.mock('@/lib/service-agreements', () => ({
  agreementsQueryOptions: (workspaceId: string) => ({
    queryKey: ['service-agreements', workspaceId],
    queryFn: async () => mockAgreements,
  }),
}));

vi.mock('@/lib/services', () => ({
  attachServiceAgreement: vi.fn(),
}));

import { Dialog } from '@repo/ui/dialog';

vi.mock('@repo/ui/dialog', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Dialog: vi.fn((props: any) => {
      return <actual.Dialog {...props} />;
    }),
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

afterEach(() => {
  vi.clearAllMocks();
  queryClient.clear();
});

describe('AddAgreementModal Component Test Suite', () => {
  it('renders selectable published agreements and handles successful attachment', async () => {
    vi.mocked(attachServiceAgreement).mockResolvedValueOnce({} as any);
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={onOpenChange}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={[]}
        />
      </QueryClientProvider>,
    );

    // Wait for mock query to load and render selectable agreements
    const modal = await screen.findByRole('dialog', { name: /add a service agreement/i });
    expect(modal).toBeInTheDocument();

    // Wait for the agreements to render
    const workspacePublishedTOS = await within(modal).findByText('Workspace Published TOS');
    expect(workspacePublishedTOS).toBeInTheDocument();

    // Verify draft TOS is excluded (only status === 'published' are selectable)
    expect(within(modal).queryByText('Workspace Draft TOS')).not.toBeInTheDocument();

    // Verify published TOS and global privacy policy are listed
    expect(within(modal).getByText('Global Privacy Policy')).toBeInTheDocument();

    // Verify Global badge is rendered for global agreement
    expect(within(modal).getByText('Global')).toBeInTheDocument();

    // Click Workspace Published TOS to attach
    const attachBtn = within(modal).getByRole('button', { name: 'Workspace Published TOS' });
    await userEvent.click(attachBtn);

    // Verify attachServiceAgreement was called
    expect(attachServiceAgreement).toHaveBeenCalledWith('s1', 'v1', 'a3');

    // Verify onOpenChange(false) was triggered
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('excludes document IDs specified in excludeDocumentIds', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={vi.fn()}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={['a1']} // Exclude Global Privacy Policy
        />
      </QueryClientProvider>,
    );

    const modal = await screen.findByRole('dialog', { name: /add a service agreement/i });
    expect(modal).toBeInTheDocument();

    // Wait for the agreements to render
    const workspacePublishedTOS = await within(modal).findByText('Workspace Published TOS');
    expect(workspacePublishedTOS).toBeInTheDocument();

    // Verify a1 (Global Privacy Policy) is excluded
    expect(within(modal).queryByText('Global Privacy Policy')).not.toBeInTheDocument();
  });

  it('renders fallback description when no published agreements are selectable', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={vi.fn()}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={['a1', 'a3']} // Exclude all published
        />
      </QueryClientProvider>,
    );

    const modal = await screen.findByRole('dialog', { name: /add a service agreement/i });
    expect(modal).toBeInTheDocument();

    // Verify empty state fallback is rendered
    expect(
      await within(modal).findByText(/No published agreements available to attach/i),
    ).toBeInTheDocument();
  });

  it('renders API error banner on mutation failure', async () => {
    vi.mocked(attachServiceAgreement).mockRejectedValueOnce(new Error('Failed to attach document'));
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={onOpenChange}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={[]}
        />
      </QueryClientProvider>,
    );

    const modal = await screen.findByRole('dialog', { name: /add a service agreement/i });
    const workspacePublishedTOS = await within(modal).findByText('Workspace Published TOS');
    expect(workspacePublishedTOS).toBeInTheDocument();

    const attachBtn = within(modal).getByRole('button', { name: 'Workspace Published TOS' });
    await userEvent.click(attachBtn);

    // Verify error banner is rendered and onOpenChange not called
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Failed to attach document');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('triggers onOpenChange(false) when dialog requests close and not pending', async () => {
    const onOpenChange = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={onOpenChange}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={[]}
        />
      </QueryClientProvider>,
    );

    await screen.findByRole('dialog', { name: /add a service agreement/i });

    // Grab Dialog call props
    const dialogProps = vi
      .mocked(Dialog)
      .mock.calls.find((call) => (call[0] as any).open === true)?.[0] as any;
    expect(dialogProps).toBeDefined();

    // Call onOpenChange(false)
    dialogProps.onOpenChange(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not trigger onOpenChange when dialog requests close but attach is pending', async () => {
    const onOpenChange = vi.fn();
    // Keep mutation pending forever
    vi.mocked(attachServiceAgreement).mockReturnValueOnce(new Promise(() => {}));

    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={onOpenChange}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={[]}
        />
      </QueryClientProvider>,
    );

    const modal = await screen.findByRole('dialog', { name: /add a service agreement/i });
    const attachBtn = await within(modal).findByRole('button', { name: 'Workspace Published TOS' });
    await userEvent.click(attachBtn);

    // Wait for mutation to start and button to be disabled
    await waitFor(() => {
      expect(attachBtn).toBeDisabled();
    });

    // Grab Dialog call props from the latest render
    const dialogProps = [...vi.mocked(Dialog).mock.calls]
      .reverse()
      .find((call) => (call[0] as any).open === true)?.[0] as any;

    // Call onOpenChange(false) while pending
    dialogProps.onOpenChange(false);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('does not trigger onOpenChange when next is true', async () => {
    const onOpenChange = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <AddAgreementModal
          open={true}
          onOpenChange={onOpenChange}
          serviceId="s1"
          versionId="v1"
          workspaceId="w1"
          excludeDocumentIds={[]}
        />
      </QueryClientProvider>,
    );

    await screen.findByRole('dialog', { name: /add a service agreement/i });

    const dialogProps = vi
      .mocked(Dialog)
      .mock.calls.find((call) => (call[0] as any).open === true)?.[0] as any;

    dialogProps.onOpenChange(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
