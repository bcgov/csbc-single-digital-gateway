import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceSelectionPage } from '@/components/console/pages/workspace-selection';
import { authedUser, mockAuth, renderApp } from '../../../../support/render-app';
import { adminWorkspace } from '../../../../support/fixtures';

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const burnaby = {
  id: 'w2',
  slug: 'burnaby',
  name: 'Burnaby',
  role: 'member' as const,
  createdAt: '2026-06-02T00:00:00.000Z',
};

describe('WorkspaceSelectionPage Component Test Suite', () => {
  it('lists the caller workspaces as links into /app/:slug (no auto-redirect)', async () => {
    mockAuth(authedUser, { workspaces: [riverton, burnaby] });
    const { router } = renderApp('/app');

    // Stays on /app — no redirect to a workspace.
    expect(router.state.location.pathname).toBe('/app');

    const rivertonLink = await screen.findByRole('link', { name: /riverton/i }, { timeout: 32000 });
    expect(rivertonLink).toHaveAttribute('href', '/app/riverton');
    expect(screen.getByRole('link', { name: /burnaby/i })).toHaveAttribute('href', '/app/burnaby');
    expect(screen.getByText('Hello, Maya')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('opens the create workspace modal when clicking New Workspace in header (L43)', async () => {
    mockAuth(authedUser, { workspaces: [adminWorkspace] });
    renderApp('/app');

    const newBtn = await screen.findByRole(
      'button',
      { name: /new workspace/i },
      { timeout: 32000 },
    );
    const user = userEvent.setup();
    await user.click(newBtn);

    const dialog = await screen.findByRole('dialog', { name: /create workspace/i });
    expect(dialog).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    expect(screen.queryByRole('dialog', { name: /create workspace/i })).not.toBeInTheDocument();
  });

  it('renders fallback title "Hello" when user displayName has no first name', async () => {
    const userWithoutName = {
      id: 'u2',
      roles: ['staff'],
      claims: {
        sub: 'subject-2',
        name: '',
        email: '',
      },
    };
    mockAuth(userWithoutName, { workspaces: [adminWorkspace] });
    renderApp('/app');

    await screen.findByRole('link', { name: /riverton/i }, { timeout: 32000 });
    expect(screen.getByRole('heading', { name: /^hello$/i })).toBeInTheDocument();
  });

  it('shows an empty state with a Create workspace action when the user has none', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    expect(
      await screen.findByText(/no workspaces yet/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    const createBtn = screen.getByRole('button', { name: /create workspace/i });

    const user = userEvent.setup();
    await user.click(createBtn);
    // The create dialog opens (dismissable — not the forced onboarding modal).
    expect(await screen.findByRole('dialog', { name: /create workspace/i })).toBeInTheDocument();
  });

  it('renders loading skeletons and fallback title while loading without user', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // keep in loading state
          queryFn: () => new Promise(() => {}),
        },
      },
    });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceSelectionPage />
      </QueryClientProvider>,
    );

    expect(container.querySelectorAll('.animate-pulse').length).toBe(2);
    expect(screen.getByRole('heading', { name: /^hello$/i })).toBeInTheDocument();
  });

  it('handles nullish fallback when split returns empty array', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    queryClient.setQueryData(['auth', 'me'], authedUser);
    queryClient.setQueryData(['workspaces'], [adminWorkspace]);

    const splitSpy = vi.spyOn(String.prototype, 'split').mockReturnValueOnce([] as any);
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceSelectionPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: /^hello$/i })).toBeInTheDocument();
    splitSpy.mockRestore();
  });
});
