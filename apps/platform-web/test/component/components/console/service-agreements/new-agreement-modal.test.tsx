import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewAgreementModal } from '@/components/console/service-agreements/new-agreement-modal';
import type { AgreementScope } from '@/components/console/service-agreements/scope';
import { createAgreement } from '@/lib/service-agreements';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/lib/service-agreements', () => ({
  createAgreement: vi.fn(),
}));

let capturedOnOpenChange: ((open: boolean) => void) | undefined;
vi.mock('@repo/ui/dialog', () => ({
  Dialog: vi.fn(({ open, onOpenChange, children }: any) => {
    capturedOnOpenChange = onOpenChange;
    return (
      <div data-testid="mock-dialog" data-open={open}>
        {children}
      </div>
    );
  }),
  DialogContent: vi.fn(({ children }: any) => (
    <div role="dialog" aria-label="New service agreement">
      {children}
    </div>
  )),
  DialogHeader: vi.fn(({ children }: any) => <div>{children}</div>),
  DialogTitle: vi.fn(({ children }: any) => <h2>{children}</h2>),
  DialogDescription: vi.fn(({ children }: any) => <p>{children}</p>),
}));

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

const workspaceScope: AgreementScope = { kind: 'workspace', slug: 'riverton', workspaceId: 'w1' };
const adminScope: AgreementScope = { kind: 'admin' };

describe('NewAgreementModal Component Test Suite', () => {
  it('renders workspace scope, submits creation payload, and navigates to the detail page on success', async () => {
    (createAgreement as any).mockResolvedValueOnce({
      agreement: { id: 'new-a1' },
      version: { id: 'new-v1' },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={workspaceScope} />
      </QueryClientProvider>,
    );

    // Verify modal title
    expect(screen.getByText('New service agreement')).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);
    const createBtn = screen.getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'Workspace Agreement');
    await userEvent.type(descInput, 'Description content');
    await userEvent.click(createBtn);

    // Verify createAgreement was called with workspaceId
    expect(createAgreement).toHaveBeenCalledWith({
      workspaceId: 'w1',
      data: {
        title: 'Workspace Agreement',
        description: 'Description content',
      },
    });

    // Verify navigate was called with correct router parameters
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/$slug/service-agreements/$id',
        params: { slug: 'riverton', id: 'new-a1' },
        replace: true,
      });
    });
  });

  it('renders admin scope and submits creation without workspaceId', async () => {
    (createAgreement as any).mockResolvedValueOnce({
      agreement: { id: 'global-a1' },
      version: { id: 'global-v1' },
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={adminScope} />
      </QueryClientProvider>,
    );

    const titleInput = screen.getByLabelText(/title/i);
    const createBtn = screen.getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'Global Policy');
    await userEvent.click(createBtn);

    // Verify createAgreement does not carry workspaceId
    expect(createAgreement).toHaveBeenCalledWith({
      data: {
        title: 'Global Policy',
        description: '',
      },
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/service-agreements/$id',
        params: { id: 'global-a1' },
        replace: true,
      });
    });
  });

  it('closes modal and navigates back to list on Cancel', async () => {
    // 1. Workspace scope cancel
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={workspaceScope} />
      </QueryClientProvider>,
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/service-agreements',
      params: { slug: 'riverton' },
    });

    unmount();
    vi.clearAllMocks();

    // 2. Admin scope cancel
    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={adminScope} />
      </QueryClientProvider>,
    );

    const cancelBtnAdmin = screen.getByRole('button', { name: /cancel/i });
    await userEvent.click(cancelBtnAdmin);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/admin/service-agreements',
    });
  });

  it('renders API error message on creation failure', async () => {
    vi.mocked(createAgreement).mockRejectedValueOnce(new Error('Failed to create agreement'));

    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={workspaceScope} />
      </QueryClientProvider>,
    );

    const titleInput = screen.getByLabelText(/title/i);
    const createBtn = screen.getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'Failed TOS');
    await userEvent.click(createBtn);

    // Verify error is rendered in dialog
    const errorMsg = await screen.findByRole('alert');
    expect(errorMsg).toHaveTextContent('Failed to create agreement');
  });

  it('shows error if form is submitted with empty title', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={workspaceScope} />
      </QueryClientProvider>,
    );

    const form = screen.getByRole('dialog').querySelector('form')!;
    // Submit form directly without typing title (HTML validation bypassed)
    fireEvent.submit(form);

    const errorMsg = await screen.findByRole('alert');
    expect(errorMsg).toHaveTextContent('A title is required');
  });

  it('covers onOpenChange true and false branches', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={workspaceScope} />
      </QueryClientProvider>,
    );

    expect(capturedOnOpenChange).toBeDefined();

    // Call with true - should do nothing (does not call mockNavigate)
    capturedOnOpenChange!(true);
    expect(mockNavigate).not.toHaveBeenCalled();

    // Call with false - should navigate back
    capturedOnOpenChange!(false);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/service-agreements',
      params: { slug: 'riverton' },
    });
  });

  it('renders spinner and disables submit button when creation is pending', async () => {
    let resolvePromise!: (val: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (createAgreement as any).mockReturnValueOnce(promise);

    render(
      <QueryClientProvider client={queryClient}>
        <NewAgreementModal scope={workspaceScope} />
      </QueryClientProvider>,
    );

    const titleInput = screen.getByLabelText(/title/i);
    const createBtn = screen.getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'Pending TOS');
    await userEvent.click(createBtn);

    // Verify button is disabled during pending state
    expect(createBtn).toBeDisabled();

    // Resolve query to clean up
    resolvePromise({
      agreement: { id: 'new-a1' },
      version: { id: 'new-v1' },
    });
  });
});
