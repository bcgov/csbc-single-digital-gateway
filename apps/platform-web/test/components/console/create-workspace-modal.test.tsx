import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateWorkspaceModal } from '@/components/console/create-workspace-modal';
import { createWorkspace, type Workspace } from '@/lib/workspaces';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/lib/workspaces', () => ({
  createWorkspace: vi.fn((name) => {
    console.log('MOCKED createWorkspace CALLED WITH:', name);
    return Promise.resolve({
      id: 'w-1',
      slug: 'city-of-riverton',
      name,
      role: 'admin',
      ownerId: 'u-1',
      createdAt: '2026-07-15T00:00:00Z',
    });
  }),
}));

function renderModal(
  queryClient: QueryClient,
  props: {
    dismissable?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  } = {},
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateWorkspaceModal {...props} />
    </QueryClientProvider>,
  );
}

describe('CreateWorkspaceModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('renders nothing when open is false', () => {
    renderModal(queryClient, { open: false });
    expect(screen.queryByRole('heading', { name: 'Create workspace' })).not.toBeInTheDocument();
  });

  it('renders forced onboarding style when dismissable is false', () => {
    renderModal(queryClient, { dismissable: false, open: true });

    expect(screen.getByRole('heading', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByText('Create your first workspace to get started.')).toBeInTheDocument();

    // No cancel button should be rendered
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    // Create workspace button is disabled initially because input is empty
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeDisabled();
  });

  it('renders dismissable new workspace style when dismissable is true', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    renderModal(queryClient, { dismissable: true, open: true, onOpenChange: handleOpenChange });

    expect(screen.getByRole('heading', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByText('Add a new workspace to organise your services.')).toBeInTheDocument();

    // Cancel button should be rendered
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toBeInTheDocument();

    // Clicking cancel triggers onOpenChange(false)
    await user.click(cancelBtn);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits workspace creation successfully and navigates to the new workspace', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    vi.mocked(createWorkspace).mockResolvedValue({
      id: 'w-1',
      slug: 'city-of-riverton',
      name: 'City of Riverton',
      role: 'admin',
      ownerId: 'u-1',
      createdAt: '2026-07-15T00:00:00Z',
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderModal(queryClient, { dismissable: true, open: true, onOpenChange: handleOpenChange });

    const input = screen.getByLabelText(/workspace name/i);
    await user.type(input, 'City of Riverton');

    const submitBtn = screen.getByRole('button', { name: 'Create workspace' });
    expect(submitBtn).toBeEnabled();

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createWorkspace).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(createWorkspace).mock.calls[0]?.[0]).toBe('City of Riverton');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug',
      params: { slug: 'city-of-riverton' },
    });
  });

  it('displays error message when workspace creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(createWorkspace).mockRejectedValue(new Error('Network error'));

    renderModal(queryClient, { dismissable: true, open: true });

    const input = screen.getByLabelText(/workspace name/i);
    await user.type(input, 'Failed Workspace');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(
      await screen.findByText('Could not create the workspace. Please try again.'),
    ).toBeInTheDocument();
  });

  it('renders with default props (open: true, dismissable: false)', () => {
    renderModal(queryClient); // No props passed
    expect(screen.getByRole('heading', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByText('Create your first workspace to get started.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('does not submit if the workspace name is empty or only whitespace', async () => {
    renderModal(queryClient, { dismissable: true, open: true });
    const input = screen.getByLabelText(/workspace name/i);
    const form = input.closest('form')!;

    // Set input value to spaces
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(form);

    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it('handles successful submit when onOpenChange is not provided', async () => {
    const user = userEvent.setup();
    vi.mocked(createWorkspace).mockResolvedValue({
      id: 'w-1',
      slug: 'city-of-riverton',
      name: 'City of Riverton',
      role: 'admin',
      ownerId: 'u-1',
      createdAt: '2026-07-15T00:00:00Z',
    });

    renderModal(queryClient, { dismissable: true, open: true }); // No onOpenChange provided

    const input = screen.getByLabelText(/workspace name/i);
    await user.type(input, 'City of Riverton');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createWorkspace).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug',
      params: { slug: 'city-of-riverton' },
    });
  });

  it('handles cancel click when onOpenChange is not provided', async () => {
    const user = userEvent.setup();
    renderModal(queryClient, { dismissable: true, open: true }); // No onOpenChange provided
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await expect(user.click(cancelBtn)).resolves.not.toThrow();
  });

  it('disables the submit button while workspace creation is in progress', async () => {
    const user = userEvent.setup();
    let resolvePromise!: (val: any) => void;
    const promise: Promise<Workspace> = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(createWorkspace).mockReturnValue(promise);

    renderModal(queryClient, { dismissable: true, open: true });

    const input = screen.getByLabelText(/workspace name/i);
    await user.type(input, 'New Workspace');

    const submitBtn = screen.getByRole('button', { name: 'Create workspace' });
    expect(submitBtn).toBeEnabled();

    const form = input.closest('form')!;
    fireEvent.submit(form);

    // It should be disabled during the pending state (mutation.isPending)
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Resolve the promise to complete the test
    resolvePromise({
      id: 'w-1',
      slug: 'new-workspace',
      name: 'New Workspace',
      role: 'admin',
      ownerId: 'u-1',
      createdAt: '2026-07-15T00:00:00Z',
    });

    await waitFor(() => {
      expect(createWorkspace).toHaveBeenCalledTimes(1);
    });
  });
});
