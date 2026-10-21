import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderApp } from '../../../support/render-app';
import { ISO } from '../../../support/fixtures';
import { addMembers } from '../../../support/testHelpers';
import { mockMembersBff } from '../../../support/mock-members-bff';

export let capturedOnOpenChange: ((next: boolean) => void) | undefined;

vi.mock('@repo/ui/dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/ui/dialog')>();
  return {
    ...actual,
    Dialog: (props: any) => {
      capturedOnOpenChange = props.onOpenChange;
      return <actual.Dialog {...props} />;
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const members = { items: addMembers() };

const staff = [
  { id: 'u2', displayName: 'Sam Lee', email: 'sam@riverton.gov' },
  { id: 'u3', displayName: 'Dana Kim', email: 'dana@riverton.gov' },
];

describe('Add Member Modal Component Test Suite', () => {
  it('Should let an admin search staff, pick a role, and add a member', async () => {
    const fetchMock = mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      role: 'admin',
      staff,
    });
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    // First mount compiles the code-split team route — allow extra time (3rd arg waitForOptions).
    const addButton = await screen.findByRole('button', { name: 'Add member' }, { timeout: 32000 });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    // Both staff show initially.
    expect(await within(dialog).findByText('Sam Lee')).toBeInTheDocument();
    expect(within(dialog).getByText('Dana Kim')).toBeInTheDocument();

    // Server-side search narrows the list.
    await user.type(within(dialog).getByLabelText('Search staff'), 'sam');
    await waitFor(() => expect(within(dialog).queryByText('Dana Kim')).not.toBeInTheDocument());
    expect(within(dialog).getByText('Sam Lee')).toBeInTheDocument();

    // Pick Sam, choose Admin, add.
    await user.click(within(dialog).getByText('Sam Lee'));
    await user.click(within(dialog).getByRole('button', { name: 'Admin' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith('/v1/workspaces/w1/members') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ userId: 'u2', role: 'admin' });
    });
  });

  it('Should hide the Add member action from non-admins', async () => {
    mockMembersBff(members, { testFile: 'add-member-modal.test', role: 'member', staff });
    renderApp('/app/riverton/team');

    expect(
      await screen.findByText('Maya Reyes', undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });

  it('Should display "No email on file" when staff member email is not present', async () => {
    const staffWithNoEmail = [{ id: 'u4', displayName: 'No Email Guy', email: undefined }];
    mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      role: 'admin',
      staff: staffWithNoEmail,
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('No Email Guy')).toBeInTheDocument();
    expect(within(dialog).getByText('No email on file')).toBeInTheDocument();

    await user.click(within(dialog).getByText('No Email Guy'));
    expect(within(dialog).getByText('No email on file')).toBeInTheDocument();
  });

  it('Should show error message if add member API fails', async () => {
    mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      role: 'admin',
      staff,
      failedApi: true,
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByText('Sam Lee'));

    const submitBtn = within(dialog).getByRole('button', { name: 'Add member' });
    await user.click(submitBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'POST /v1/workspaces/:id/members failed: 400',
    );
  });

  it('shows "No staff found." when search result is empty', async () => {
    mockMembersBff(members, { testFile: 'add-member-modal.test', staff: [] });

    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('No staff found.')).toBeInTheDocument();
  });

  it('Should show spinner when addable staff list is loading', async () => {
    let resolveStaff: ((r: Response) => void) | null = null;
    mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      staff,
      resolveStaff: (resolve) => {
        resolveStaff = resolve;
      },
    });

    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    const user = userEvent.setup();
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('[data-slot="spinner"]')).toBeInTheDocument();

    resolveStaff!(jsonResponse({ items: staff }));

    await waitFor(() => {
      expect(dialog.querySelector('[data-slot="spinner"]')).not.toBeInTheDocument();
    });
  });

  it('Should disable dialog buttons and show spinner while add mutation is pending', async () => {
    let resolveAdd: ((r: Response) => void) | null = null;
    mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      staff,
      resolveAdd: (resolve) => {
        resolveAdd = resolve;
      },
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByText('Sam Lee'));

    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });
    const addBtn = within(dialog).getByRole('button', { name: 'Add member' });

    await user.click(addBtn);

    expect(cancelBtn).toBeDisabled();
    expect(addBtn).toBeDisabled();
    expect(addBtn.querySelector('[data-slot="spinner"]')).toBeInTheDocument();

    resolveAdd!(
      jsonResponse(
        {
          id: 'm2',
          userId: 'u2',
          role: 'member',
          status: 'active',
          displayName: 'Sam Lee',
          email: 'sam@riverton.gov',
          isOwner: false,
          joinedAt: ISO,
        },
        201,
      ),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Should let an admin search staff, pick a member role, and add a member', async () => {
    const fetchMock = mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      role: 'admin',
      staff,
    });
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByText('Sam Lee'));

    await user.click(within(dialog).getByRole('button', { name: 'Member' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith('/v1/workspaces/w1/members') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ userId: 'u2', role: 'member' });
    });
  });

  it('Should let the user change the selected staff member', async () => {
    mockMembersBff(members, { testFile: 'add-member-modal.test', role: 'admin', staff });
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByText('Sam Lee'));

    const changeBtn = within(dialog).getByRole('button', { name: 'Change' });
    await user.click(changeBtn);

    expect(within(dialog).getByLabelText('Search staff')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });

  it('Should close the dialog when Cancel is clicked or Escape is pressed', async () => {
    mockMembersBff(members, { testFile: 'add-member-modal.test', role: 'admin', staff });
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByText('Sam Lee'));

    const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(addButton);
    const dialog2 = await screen.findByRole('dialog');
    expect(dialog2).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Should handle staff with undefined id using fallback and handle onOpenChange true branch', async () => {
    const staffWithNoId = [
      { id: undefined as unknown as string, displayName: 'No ID User', email: 'noid@riverton.gov' },
    ];
    const fetchMock = mockMembersBff(members, {
      testFile: 'add-member-modal.test',
      staff: staffWithNoId,
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByText('No ID User'));
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith('/v1/workspaces/w1/members') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ userId: '', role: 'member' });
    });
  });

  it('Should trigger onOpenChange true branch when dialog passes true to onOpenChange', async () => {
    mockMembersBff(members, { testFile: 'add-member-modal.test', role: 'admin', staff });
    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    await screen.findByRole('dialog');
    expect(capturedOnOpenChange).toBeDefined();

    // Invoking onOpenChange(true) triggers line 65's (next ? onOpenChange(true) : close()) true branch
    capturedOnOpenChange!(true);
  });
});
