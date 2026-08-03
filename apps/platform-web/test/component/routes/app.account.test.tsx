import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { Route as appAccountRoute } from '@/routes/app.account';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App Account Route', () => {
  it('renders the account page correctly', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app/account');

    // Wait for the Profile title to render
    const profileTitles = await screen.findAllByText('Profile', {}, { timeout: 32000 });
    expect(profileTitles.length).toBeGreaterThan(0);

    // Verify card description
    const descriptions = screen.getAllByText('Your personal account details.');
    expect(descriptions.length).toBeGreaterThan(0);

    // Verify avatar fallback initials for "Maya Reyes"
    const fallbacks = screen.getAllByText('MR');
    expect(fallbacks.length).toBeGreaterThan(0);

    // Verify name and email details in header card
    const names = screen.getAllByText('Maya Reyes');
    expect(names.length).toBeGreaterThan(0);
    expect(screen.getByText(/maya\.reyes@riverton\.gov · Staff/i)).toBeInTheDocument();

    // Verify form labels and input default values
    const nameInput = screen.getByLabelText('Full name');
    expect(nameInput).toHaveValue('Maya Reyes');

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toHaveValue('maya.reyes@riverton.gov');

    // Verify buttons
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('renders loading skeleton when authentication data is loading', () => {
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderApp('/app/account');

    // Should not render card elements yet
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('renders correctly when email claim is missing', async () => {
    const userNoEmail = {
      ...authedUser,
      claims: {
        sub: 'subject-1',
        name: 'Maya Reyes',
        preferred_username: 'maya',
      },
    };

    mockAuth(userNoEmail, { workspaces: [] });
    renderApp('/app/account');

    expect(await screen.findByText('Profile')).toBeInTheDocument();

    expect(screen.getAllByText('Maya Reyes').length).toBeGreaterThan(0);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Staff').length).toBeGreaterThan(0);

    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('has the correct app account route definition', () => {
    expect(appAccountRoute.options.component).toBeDefined();
  });
});
