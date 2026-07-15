import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';

const adminWorkspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  createdAt: ISO,
};

const memberWorkspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'member' as const,
  createdAt: ISO,
};

describe('SettingsPage', () => {
  it('renders loading state initially', async () => {
    const fetchMock = vi.fn(() => new Promise<any>(() => {})); // never resolves
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = renderApp('/app/riverton/settings');

    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders workspace settings for admin user (edit form enabled, delete button active)', async () => {
    const fetchMock = mockAuth(authedUser, { workspaces: [adminWorkspace] });
    const user = userEvent.setup();
    renderApp('/app/riverton/settings');

    // 1. General workspace name form is enabled
    const nameInput = await screen.findByLabelText('Workspace name');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('Riverton');
    expect(nameInput).not.toBeDisabled();

    // 2. Danger zone shows admin description and active delete button
    expect(
      screen.getByText('Deleting a workspace removes all of its data and members.'),
    ).toBeInTheDocument();
    const deleteBtn = screen.getByRole('button', { name: 'Delete workspace' });
    expect(deleteBtn).not.toBeDisabled();

    // 3. Modifying name and submitting calls updateWorkspace
    fireEvent.change(nameInput, { target: { value: 'Riverton New Name' } });
    const saveBtn = screen.getByRole('button', { name: 'Save changes' });
    expect(saveBtn).not.toBeDisabled();

    await user.click(saveBtn);
    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/workspaces/w1') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      );
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
        name: 'Riverton New Name',
      });
    });

    // 4. Clicking delete button opens confirm dialog
    await user.click(deleteBtn);
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete Riverton?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'This permanently deletes the workspace and removes every member. This cannot be undone.',
      ),
    ).toBeInTheDocument();

    // Click confirm delete in dialog
    const confirmBtn = within(dialog).getByRole('button', { name: 'Delete workspace' });
    await user.click(confirmBtn);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/workspaces/w1') &&
          (init?.method ?? 'GET').toUpperCase() === 'DELETE',
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  it('renders workspace settings for member user (edit form disabled, delete button disabled)', async () => {
    mockAuth(authedUser, { workspaces: [memberWorkspace] });
    renderApp('/app/riverton/settings');

    // 1. General workspace name form is disabled
    const nameInput = await screen.findByLabelText('Workspace name');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeDisabled();

    // 2. Danger zone shows member warning and disabled delete button
    expect(
      screen.getByText('Only workspace admins can delete this workspace.'),
    ).toBeInTheDocument();
    const deleteBtn = screen.getByRole('button', { name: 'Delete workspace' });
    expect(deleteBtn).toBeDisabled();
  });
});
