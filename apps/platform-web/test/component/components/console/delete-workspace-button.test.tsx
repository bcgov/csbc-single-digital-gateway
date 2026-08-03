import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteWorkspaceButton } from '@/components/console/delete-workspace-button';
import { deleteWorkspace } from '@/lib/workspaces';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/lib/workspaces', () => ({
  deleteWorkspace: vi.fn(),
}));

function renderDeleteButton(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <DeleteWorkspaceButton workspaceId="w-123" workspaceName="Riverton Gov" />
    </QueryClientProvider>,
  );
}

describe('DeleteWorkspaceButton Component Test Suite', () => {
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

  it('renders trigger button and does not show dialog by default', () => {
    renderDeleteButton(queryClient);

    const triggerBtn = screen.getByRole('button', { name: 'Delete workspace' });
    expect(triggerBtn).toBeInTheDocument();
    expect(screen.queryByText('Delete Riverton Gov?')).not.toBeInTheDocument();
  });

  it('opens alert dialog on trigger button click', async () => {
    const user = userEvent.setup();
    renderDeleteButton(queryClient);

    const triggerBtn = screen.getByRole('button', { name: 'Delete workspace' });
    await user.click(triggerBtn);

    expect(await screen.findByText('Delete Riverton Gov?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This permanently deletes the workspace and removes every member. This cannot be undone.',
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete workspace', xl: undefined } as any),
    ).toBeInTheDocument();
  });

  it('closes alert dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderDeleteButton(queryClient);

    const triggerBtn = screen.getByRole('button', { name: 'Delete workspace' });
    await user.click(triggerBtn);

    const cancelBtn = await screen.findByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Delete Riverton Gov?')).not.toBeInTheDocument();
    });
  });

  it('submits delete workspace request, removes queries from cache, and navigates to app gate on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteWorkspace).mockResolvedValue(null as any);
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    renderDeleteButton(queryClient);

    const triggerBtn = screen.getByRole('button', { name: 'Delete workspace' });
    await user.click(triggerBtn);

    // Get the confirm button inside the alert dialog content
    const confirmBtn = await screen.findByRole('button', {
      name: 'Delete workspace',
      // Excluding trigger button by picking the one with type submit or looking inside dialog
    });

    // In Radix, confirming is done on the Action button
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteWorkspace).toHaveBeenCalledWith('w-123');
    });

    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/app' });
  });

  it('disables the action button while delete mutation is pending', async () => {
    const user = userEvent.setup();
    let resolveDelete: ((v: null) => void) | null = null;
    vi.mocked(deleteWorkspace).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve as any;
        }),
    );

    renderDeleteButton(queryClient);

    const triggerBtn = screen.getByRole('button', { name: 'Delete workspace' });
    await user.click(triggerBtn);

    const confirmBtn = await screen.findByRole('button', { name: 'Delete workspace' });
    await user.click(confirmBtn);

    // It should be disabled
    expect(confirmBtn).toBeDisabled();

    // Resolve the promise to clean up
    resolveDelete!(null);

    await waitFor(() => {
      expect(confirmBtn).not.toBeDisabled();
    });
  });
});
