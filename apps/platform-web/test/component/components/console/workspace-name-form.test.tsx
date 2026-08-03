import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceNameForm } from '@/components/console/workspace-name-form';
import { updateWorkspace } from '@/lib/workspaces';

vi.mock('@/lib/workspaces', () => ({
  updateWorkspace: vi.fn(),
}));

function renderForm(
  queryClient: QueryClient,
  props: { workspaceId?: string; initialName?: string; canEdit?: boolean } = {},
) {
  const defaultProps = {
    workspaceId: 'w-123',
    initialName: 'My Workspace',
    canEdit: true,
    ...props,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceNameForm {...defaultProps} />
    </QueryClientProvider>,
  );
}

describe('WorkspaceNameForm Component Test Suite', () => {
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

  it('renders input as disabled and save button as disabled when canEdit is false', () => {
    renderForm(queryClient, { canEdit: false });

    const input = screen.getByLabelText('Workspace name');
    expect(input).toBeDisabled();

    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    expect(saveBtn).toBeDisabled();
  });

  it('handles clean/dirty logic and Cancel button click correctly', async () => {
    const user = userEvent.setup();
    renderForm(queryClient, { initialName: 'Original Name', canEdit: true });

    const input = screen.getByLabelText('Workspace name');
    expect(input).toHaveValue('Original Name');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const saveBtn = screen.getByRole('button', { name: 'Save changes' });

    // Initially clean -> both action buttons are disabled
    expect(cancelBtn).toBeDisabled();
    expect(saveBtn).toBeDisabled();

    // Type new characters -> becomes dirty -> actions are enabled
    await user.type(input, ' Edited');
    expect(input).toHaveValue('Original Name Edited');
    expect(cancelBtn).not.toBeDisabled();
    expect(saveBtn).not.toBeDisabled();

    // Click cancel -> resets input to original name -> buttons disabled
    await user.click(cancelBtn);
    expect(input).toHaveValue('Original Name');
    expect(cancelBtn).toBeDisabled();
    expect(saveBtn).toBeDisabled();
  });

  it('submits form successfully, calls updateWorkspace, and invalidates workspace query', async () => {
    const user = userEvent.setup();
    vi.mocked(updateWorkspace).mockResolvedValue({} as any);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderForm(queryClient, { workspaceId: 'w-abc', initialName: 'Old Name' });

    const input = screen.getByLabelText('Workspace name');
    await user.type(input, ' New Name');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      // In React Query useMutation, mutFn arguments might receive the mutation event context or options as 2nd arg
      expect(updateWorkspace).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(updateWorkspace).mock.calls[0]?.[0]).toBe('w-abc');
    expect(vi.mocked(updateWorkspace).mock.calls[0]?.[1]).toBe('Old Name New Name');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
  });

  it('renders alert message when workspace update fails', async () => {
    const user = userEvent.setup();
    vi.mocked(updateWorkspace).mockRejectedValue(new Error('API failure'));

    renderForm(queryClient, { initialName: 'Old Name' });

    const input = screen.getByLabelText('Workspace name');
    await user.type(input, ' Err');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save changes. Please try again.',
    );
  });

  it('disables save and cancel buttons when name is changed to whitespace only', async () => {
    const user = userEvent.setup();
    renderForm(queryClient, { initialName: 'My Workspace', canEdit: true });
    const input = screen.getByLabelText('Workspace name');

    // Change input to spaces
    await user.clear(input);
    await user.type(input, '   ');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const saveBtn = screen.getByRole('button', { name: 'Save changes' });

    expect(cancelBtn).toBeDisabled();
    expect(saveBtn).toBeDisabled();
  });

  it('does not submit if the form is clean', () => {
    renderForm(queryClient, { initialName: 'My Workspace', canEdit: true });
    const input = screen.getByLabelText('Workspace name');
    const form = input.closest('form')!;

    fireEvent.submit(form);

    expect(updateWorkspace).not.toHaveBeenCalled();
  });

  it('disables buttons while updateWorkspace mutation is pending', async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((v: any) => void) | null = null;
    vi.mocked(updateWorkspace).mockImplementation(
      () =>
        new Promise<any>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    renderForm(queryClient, { initialName: 'Old Name' });

    const input = screen.getByLabelText('Workspace name');
    await user.type(input, ' New Name');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    const form = input.closest('form')!;
    fireEvent.submit(form);

    // Buttons should be disabled during pending status
    await waitFor(() => {
      expect(cancelBtn).toBeDisabled();
      expect(saveBtn).toBeDisabled();
    });

    // Resolve the mutation
    resolveUpdate!({} as any);

    await waitFor(() => {
      expect(saveBtn).toBeDisabled(); // clean again after success
    });
  });
});
