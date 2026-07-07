import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: '2026-06-01T00:00:00.000Z',
};

/** Mount the console scoped to the `riverton` workspace at the given section path. */
async function renderScoped(path: string) {
  mockAuth(authedUser, { workspaces: [riverton] });
  const res = renderApp(path);
  await res.router.load();
  return res;
}

describe('console routes — every workspace-scoped destination resolves and renders', () => {
  it('renders the Overview placeholder at /app/:slug', async () => {
    await renderScoped('/app/riverton');
    expect(await screen.findByText(/Overview is being set up/i)).toBeInTheDocument();
  });

  it('renders the Services empty state at /app/:slug/services', async () => {
    await renderScoped('/app/riverton/services');
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/No services yet/i)).toBeInTheDocument();
  });

  it('renders the Submissions empty state and status tabs at /app/:slug/submissions', async () => {
    await renderScoped('/app/riverton/submissions');
    expect(await screen.findByText(/No submissions yet/i)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders the Team empty state at /app/:slug/team', async () => {
    await renderScoped('/app/riverton/team');
    expect(await screen.findByText(/Just you so far/i)).toBeInTheDocument();
  });

  it('renders the Reports empty state at /app/:slug/reports', async () => {
    await renderScoped('/app/riverton/reports');
    expect(await screen.findByText(/No saved reports yet/i)).toBeInTheDocument();
  });

  it('renders the Settings page with a danger zone at /app/:slug/settings', async () => {
    await renderScoped('/app/riverton/settings');
    expect(await screen.findByText('Workspace name')).toBeInTheDocument();
    expect(screen.getByText(/Danger zone/i)).toBeInTheDocument();
  });

  it('renders the user-scoped Account page prefilled with the signed-in user at /app/account', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    const { router } = renderApp('/app/account');
    await router.load();
    expect(await screen.findByDisplayValue('Maya Reyes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('maya.reyes@riverton.gov')).toBeInTheDocument();
  });
});
