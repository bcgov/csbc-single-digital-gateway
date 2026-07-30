import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';
import '@/routes/app';
import '@/routes/app.$slug';
import '@/routes/app.$slug.index';
import '@/routes/app.$slug.services';
import '@/routes/app.$slug.submissions';
import '@/routes/app.$slug.team';
import '@/routes/app.$slug.reports';
import '@/routes/app.$slug.settings';
import '@/routes/app.account';

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
function renderScoped(path: string) {
  mockAuth(authedUser, { workspaces: [riverton] });
  return renderApp(path);
}

describe('Console Routes Integration Test Suite', () => {
  it('renders the Overview placeholder at /app/:slug', async () => {
    renderScoped('/app/riverton');
    expect(
      await screen.findByText(/Overview is being set up/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
  });

  it('renders the Services empty state at /app/:slug/services', async () => {
    renderScoped('/app/riverton/services');
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/No services yet/i)).toBeInTheDocument();
  });

  it('renders the Submissions empty state and status tabs at /app/:slug/submissions', async () => {
    renderScoped('/app/riverton/submissions');
    expect(await screen.findByText(/No submissions yet/i)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders the Team empty state at /app/:slug/team', async () => {
    renderScoped('/app/riverton/team');
    expect(await screen.findByText(/Just you so far/i)).toBeInTheDocument();
  });

  it('renders the Reports empty state at /app/:slug/reports', async () => {
    renderScoped('/app/riverton/reports');
    expect(await screen.findByText(/No saved reports yet/i)).toBeInTheDocument();
  });

  it('renders the Settings page with a danger zone at /app/:slug/settings', async () => {
    renderScoped('/app/riverton/settings');
    expect(await screen.findByText('Workspace name')).toBeInTheDocument();
    expect(screen.getByText(/Danger zone/i)).toBeInTheDocument();
  });

  it('renders the user-scoped Account page prefilled with the signed-in user at /app/account', async () => {
    mockAuth(authedUser, { workspaces: [riverton] });
    renderApp('/app/account');
    expect(await screen.findByDisplayValue('Maya Reyes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('maya.reyes@riverton.gov')).toBeInTheDocument();
  });
});
