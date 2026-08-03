import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { Route } from '@/routes/index';
import '@/routes/index';
import '@/routes/app';

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

describe('Index Route Integration', () => {
  it('verifies route has a valid component definition', () => {
    expect(Route.options.component).toBeDefined();
  });

  it('renders landing page for anonymous visitors', async () => {
    mockAuth(null);
    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'Single Digital Gateway Platform' }),
    ).toBeInTheDocument();
    expect(screen.getByText('To continue, log in:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in with IDIR' })).toBeInTheDocument();
  });

  it('redirects signed-in visitors straight to /app', async () => {
    mockAuth(authedUser, { workspaces: [] });
    const { router } = renderApp('/');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app');
    });
  });
});
