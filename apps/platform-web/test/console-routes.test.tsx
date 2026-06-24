import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('console routes — every nav destination resolves and renders', () => {
  it('renders the Overview placeholder at /app', async () => {
    mockAuth(authedUser);
    renderApp('/app');
    expect(await screen.findByText(/Overview is being set up/i)).toBeInTheDocument();
  });

  it('renders the Services empty state at /app/services', async () => {
    mockAuth(authedUser);
    renderApp('/app/services');
    expect(await screen.findByRole('heading', { name: 'Services', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/No services yet/i)).toBeInTheDocument();
  });

  it('renders the Applications empty state at /app/applications', async () => {
    mockAuth(authedUser);
    renderApp('/app/applications');
    expect(await screen.findByText(/No applications yet/i)).toBeInTheDocument();
  });

  it('renders the Submissions empty state and status tabs at /app/submissions', async () => {
    mockAuth(authedUser);
    renderApp('/app/submissions');
    expect(await screen.findByText(/No submissions yet/i)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders the Team empty state at /app/team', async () => {
    mockAuth(authedUser);
    renderApp('/app/team');
    expect(await screen.findByText(/Just you so far/i)).toBeInTheDocument();
  });

  it('renders the Reports empty state at /app/reports', async () => {
    mockAuth(authedUser);
    renderApp('/app/reports');
    expect(await screen.findByText(/No saved reports yet/i)).toBeInTheDocument();
  });

  it('renders the Settings page with a danger zone at /app/settings', async () => {
    mockAuth(authedUser);
    renderApp('/app/settings');
    expect(await screen.findByText('Workspace name')).toBeInTheDocument();
    expect(screen.getByText(/Danger zone/i)).toBeInTheDocument();
  });

  it('renders the Account page prefilled with the signed-in user at /app/account', async () => {
    mockAuth(authedUser);
    renderApp('/app/account');
    expect(await screen.findByDisplayValue('Maya Reyes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('maya.reyes@riverton.gov')).toBeInTheDocument();
  });
});
