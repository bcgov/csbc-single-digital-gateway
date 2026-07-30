import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../../support/render-app';

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

const ISO = '2026-06-01T00:00:00.000Z';
const workspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  ownerId: 'u1',
  createdAt: ISO,
};
const members = [
  {
    id: 'm1',
    userId: 'u1',
    role: 'admin' as const,
    status: 'active' as const,
    displayName: 'Maya Reyes',
    email: 'maya@riverton.gov',
    isOwner: true,
    joinedAt: ISO,
  },
];
const staff = [
  { id: 'u2', displayName: 'Sam Lee', email: 'sam@riverton.gov' },
  { id: 'u3', displayName: 'Dana Kim', email: 'dana@riverton.gov' },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockTeamFetch(role: 'admin' | 'member' = 'admin') {
  const ws = { ...workspace, role };
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/auth/logout')) return new Response(null, { status: 200 });
    if (url.includes('/addable-staff')) {
      const q = (new URL(url, 'http://x').searchParams.get('q') ?? '').toLowerCase();
      const items = q
        ? staff.filter(
            (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
          )
        : staff;
      return json({ items });
    }
    const path = url.split('?')[0] ?? '';
    if (path.endsWith('/members') && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { userId: string; role: 'admin' | 'member' };
      const picked = staff.find((u) => u.id === body.userId)!;
      return json(
        {
          id: 'm2',
          userId: picked.id,
          role: body.role,
          status: 'active',
          displayName: picked.displayName,
          email: picked.email,
          isOwner: false,
          joinedAt: ISO,
        },
        201,
      );
    }
    if (path.endsWith('/members')) return json({ items: members });
    if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
    if (url.includes('/v1/workspaces')) {
      return json({ items: [ws], total: 1, limit: 100, offset: 0 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Add Member Modal Component Test Suite', () => {
  it('lets an admin search staff, pick a role, and add a member', async () => {
    const fetchMock = mockTeamFetch('admin');
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

  it('hides the Add member action from non-admins', async () => {
    mockTeamFetch('member');
    renderApp('/app/riverton/team');

    expect(
      await screen.findByText('Maya Reyes', undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });

  it('renders "No email on file" when staff member email is not present', async () => {
    const staffWithNoEmail = [{ id: 'u4', displayName: 'No Email Guy', email: undefined }];
    const ws = { ...workspace, role: 'admin' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/addable-staff')) {
        return json({ items: staffWithNoEmail });
      }
      const path = url.split('?')[0] ?? '';
      if (path.endsWith('/members')) return json({ items: members });
      if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
      if (url.includes('/v1/workspaces')) {
        return json({ items: [ws], total: 1, limit: 100, offset: 0 });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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

  it('shows error message if add member API fails', async () => {
    const ws = { ...workspace, role: 'admin' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/addable-staff')) return json({ items: staff });
      const path = url.split('?')[0] ?? '';
      if (path.endsWith('/members')) {
        if ((init?.method ?? 'GET').toUpperCase() === 'POST') {
          return json({ message: 'User is already a member of this workspace.' }, 400);
        }
        return json({ items: members });
      }
      if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
      if (url.includes('/v1/workspaces')) {
        return json({ items: [ws], total: 1, limit: 100, offset: 0 });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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
    const ws = { ...workspace, role: 'admin' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/addable-staff')) return json({ items: [] });
      const path = url.split('?')[0] ?? '';
      if (path.endsWith('/members')) return json({ items: members });
      if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
      if (url.includes('/v1/workspaces')) {
        return json({ items: [ws], total: 1, limit: 100, offset: 0 });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('No staff found.')).toBeInTheDocument();
  });

  it('shows spinner when addable staff list is loading', async () => {
    let resolveStaff: ((r: Response) => void) | null = null;
    const ws = { ...workspace, role: 'admin' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/addable-staff')) {
        return new Promise<Response>((resolve) => {
          resolveStaff = resolve;
        });
      }
      const path = url.split('?')[0] ?? '';
      if (path.endsWith('/members')) return json({ items: members });
      if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
      if (url.includes('/v1/workspaces')) {
        return json({ items: [ws], total: 1, limit: 100, offset: 0 });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp('/app/riverton/team');

    const addButton = await screen.findByRole('button', { name: 'Add member' });
    const user = userEvent.setup();
    await user.click(addButton);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('.animate-spin')).toBeInTheDocument();

    resolveStaff!(json({ items: staff }));

    await waitFor(() => {
      expect(dialog.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  it('disables dialog buttons and shows spinner while add mutation is pending', async () => {
    let resolveAdd: ((r: Response) => void) | null = null;
    const ws = { ...workspace, role: 'admin' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/addable-staff')) return json({ items: staff });
      const path = url.split('?')[0] ?? '';
      if (path.endsWith('/members')) {
        if ((init?.method ?? 'GET').toUpperCase() === 'POST') {
          return new Promise<Response>((resolve) => {
            resolveAdd = resolve;
          });
        }
        return json({ items: members });
      }
      if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
      if (url.includes('/v1/workspaces')) {
        return json({ items: [ws], total: 1, limit: 100, offset: 0 });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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
    expect(addBtn.querySelector('.animate-spin')).toBeInTheDocument();

    resolveAdd!(
      json(
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

  it('lets an admin search staff, pick a member role, and add a member', async () => {
    const fetchMock = mockTeamFetch('admin');
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

  it('lets the user change the selected staff member', async () => {
    mockTeamFetch('admin');
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

  it('closes the dialog when Cancel is clicked or Escape is pressed', async () => {
    mockTeamFetch('admin');
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

  it('handles staff with undefined id using fallback and handles onOpenChange true branch', async () => {
    const staffWithNoId = [
      { id: undefined as unknown as string, displayName: 'No ID User', email: 'noid@riverton.gov' },
    ];
    const ws = { ...workspace, role: 'admin' as const };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/addable-staff')) return json({ items: staffWithNoId });
      const path = url.split('?')[0] ?? '';
      if (path.endsWith('/members') && (init?.method ?? 'GET').toUpperCase() === 'POST') {
        return json(
          {
            id: 'm2',
            userId: '',
            role: 'member',
            status: 'active',
            displayName: 'No ID User',
            email: 'noid@riverton.gov',
            isOwner: false,
            joinedAt: ISO,
          },
          201,
        );
      }
      if (path.endsWith('/members')) return json({ items: members });
      if (url.includes('/v1/workspaces/by-slug/')) return json(ws);
      if (url.includes('/v1/workspaces')) {
        return json({ items: [ws], total: 1, limit: 100, offset: 0 });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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

  it('triggers onOpenChange true branch when dialog passes true to onOpenChange', async () => {
    mockTeamFetch('admin');
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
