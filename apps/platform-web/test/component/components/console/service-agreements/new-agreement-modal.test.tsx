import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewAgreementModal } from '@/components/console/service-agreements/new-agreement-modal';
import { createAgreement } from '@/lib/service-agreements';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { adminScope, workspaceScope } from '../../../../support/fixtures';
import { mockNavigate } from '../../../../support/vi-fixtures';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

// Doc 228: the picker is covered by its own test; here it answers with one template, as it does
// when exactly one is published.
vi.mock('@/components/common/template-select', async () => {
  const { useEffect } = await import('react');
  return {
    TemplateSelect: ({ onChange }: { onChange: (id: string) => void }) => {
      useEffect(() => onChange('tpl-1'), [onChange]);
      return null;
    },
  };
});

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

describe('NewAgreementModal Component Test Suite', () => {
  it('Should render workspace scope, submits creation payload, and navigate to the detail page on success', async () => {
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
    const createBtn = screen.getByRole('button', { name: /create agreement/i });

    // Feature 217: create takes a TITLE only — the description field went with the version `data`.
    expect(screen.queryByLabelText(/description/i)).toBeNull();

    await userEvent.type(titleInput, 'Workspace Agreement');
    await userEvent.click(createBtn);

    // Verify createAgreement was called with workspaceId
    expect(createAgreement).toHaveBeenCalledWith({
      workspaceId: 'w1',
      title: 'Workspace Agreement',
      templateId: 'tpl-1',
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

  it('Should render admin scope and submit creation without workspaceId', async () => {
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
    expect(createAgreement).toHaveBeenCalledWith({ title: 'Global Policy', templateId: 'tpl-1' });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/service-agreements/$id',
        params: { id: 'global-a1' },
        replace: true,
      });
    });
  });

  it('Should close modal and navigate back to list on Cancel', async () => {
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

  it('Should render API error message on creation failure', async () => {
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

  it('Should show error if form is submitted with empty title', async () => {
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

  it('Should cover onOpenChange true and false branches', () => {
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

  it('Should render spinner and disable submit button when creation is pending', async () => {
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
