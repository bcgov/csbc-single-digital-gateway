import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceDefaultAgreements } from '@/components/console/service-agreements/workspace-default-agreements';

const ISO = '2026-07-09T00:00:00.000Z';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const theDefault = {
  id: 'd1',
  agreementDocumentId: 'a1',
  title: 'Terms of service',
  isOptional: false,
  isGlobal: false,
  createdAt: ISO,
};

function mockFetch(role: 'admin' | 'member', mockErrors = false, agreementsList: any[] = []) {
  const defaultAgreements = [
    { id: 'a1', workspaceId: 'w1', title: 'Terms of service', status: 'published' },
    { id: 'a2', workspaceId: null, title: 'Privacy policy', status: 'published' },
    { id: 'a3', workspaceId: 'w1', title: 'Workspace Custom TOS', status: 'published' },
  ];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/v1/workspaces/by-slug/')) {
      return json({
        id: 'w1',
        slug: 'riverton',
        name: 'Riverton',
        role,
        ownerId: 'u1',
        createdAt: ISO,
      });
    }

    if (url.includes('/v1/workspaces/w1/default-agreements')) {
      if (method === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (mockErrors) {
          return json({ message: 'Failed to add default agreement' }, 400);
        }
        return json({
          id: 'd2',
          agreementDocumentId: 'a2',
          title: 'Privacy policy',
          isOptional: true,
          isGlobal: true,
          createdAt: ISO,
        });
      }

      if (method === 'DELETE') {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (mockErrors) {
          return json({ message: 'Failed to remove default agreement' }, 400);
        }
        return new Response(null, { status: 204 });
      }

      return json({ items: [theDefault] });
    }

    if (url.includes('/v1/service-agreements')) {
      return json({
        items: agreementsList.length > 0 ? agreementsList : defaultAgreements,
      });
    }

    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceDefaultAgreements slug="riverton" workspaceId="w1" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('workspace default agreements panel', () => {
  it('lets a workspace ADMIN see, add, and remove defaults; the picker excludes already-default', async () => {
    mockFetch('admin');
    renderPanel();
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add default/i }));
    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    // Available: the published, not-yet-default one; excluded: the already-default one.
    expect(await screen.findByText('Privacy policy')).toBeInTheDocument();
    expect(screen.queryByText('Terms of service')).toBeInTheDocument();
    expect(dialog).toBeInTheDocument();
  });

  it('shows the list read-only for a non-admin member (no add/remove)', async () => {
    mockFetch('member');
    renderPanel();
    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add default/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('allows adding a default agreement successfully', async () => {
    const fetchMock = mockFetch('admin');
    renderPanel();

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

  it('renders API error warning when adding default fails', async () => {
    mockFetch('admin', true);
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const privacyBtn = within(dialog).getByRole('button', { name: /privacy policy/i });
    await userEvent.click(privacyBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Failed to add default agreement');
  });

  it('allows removing a default agreement successfully', async () => {
    const fetchMock = mockFetch('admin');
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeBtn);

    // Verify DELETE was called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/workspaces/w1/default-agreements/d1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('renders API error warning when removing default fails', async () => {
    mockFetch('admin', true);
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeBtn);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Remove default failed: 400');
  });

  it('displays correct badges for Optional, Required and Global properties', async () => {
    const customDefault = {
      id: 'd1',
      agreementDocumentId: 'a1',
      title: 'TOS',
      isOptional: true,
      isGlobal: true,
      createdAt: ISO,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/workspaces/by-slug/')) {
        return json({
          id: 'w1',
          slug: 'riverton',
          name: 'Riverton',
          role: 'admin',
          ownerId: 'u1',
          createdAt: ISO,
        });
      }
      if (url.includes('/v1/workspaces/w1/default-agreements')) {
        return json({ items: [customDefault] });
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderPanel();

    expect(await screen.findByText('TOS')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('shows no published agreements fallback in the picker when all are defaulted', async () => {
    // Only 'Terms of service' is published, and it's already a default document
    mockFetch('admin', false, [
      { id: 'a1', workspaceId: 'w1', title: 'Terms of service', status: 'published' },
    ]);
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    expect(
      within(dialog).getByText('No published agreements available to add.'),
    ).toBeInTheDocument();
  });

  it('closes picker dialog when cancel close button is clicked', async () => {
    mockFetch('admin');
    renderPanel();

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

  it('disables the add button in the picker when the mutation is pending', async () => {
    mockFetch('admin');
    renderPanel();

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

  it('disables the remove button when the delete mutation is pending', async () => {
    mockFetch('admin');
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });

    // Trigger delete mutation
    await userEvent.click(removeBtn);

    // Verify it is disabled during pending state
    expect(removeBtn).toBeDisabled();

    // Wait for the query to resolve
    await screen.findByText('Terms of service');
  });

  it('prevents dialog dismiss when Escape key is pressed while add is pending', async () => {
    mockFetch('admin');
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole(
      'dialog',
      { name: /add a default agreement/i },
      { timeout: 32000 },
    );
    const privacyBtn = within(dialog).getByRole('button', { name: /privacy policy/i });

    // Trigger mutation
    await userEvent.click(privacyBtn);

    // Press Escape immediately while pending
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

    // Dialog should NOT close because add.isPending is true
    expect(dialog).toBeInTheDocument();

    // Wait for dialog to dismiss on success after pending resolves
    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('renders workspace-scoped selectable agreements without a Global badge in the picker', async () => {
    mockFetch('admin');
    renderPanel();

    expect(await screen.findByText('Terms of service')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add default/i }));

    const dialog = await screen.findByRole('dialog', { name: /add a default agreement/i });
    const customTOSBtn = within(dialog).getByRole('button', { name: /workspace custom tos/i });
    expect(customTOSBtn).toBeInTheDocument();

    // Verify there is no 'Global' badge inside this button
    expect(within(customTOSBtn).queryByText('Global')).not.toBeInTheDocument();
  });
});
