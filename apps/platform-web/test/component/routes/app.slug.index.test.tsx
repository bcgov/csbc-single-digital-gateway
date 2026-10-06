import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { adminWorkspace } from '../../support/fixtures';

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

describe('App Slug Index Route', () => {
  it('renders the overview page placeholder content', async () => {
    mockAuth(authedUser, { workspaces: [adminWorkspace] });
    const { container } = renderApp('/app/riverton/');

    // Verify the redesigned overview content is shown (Create-new-service CTA is unique to this page)
    expect(
      await screen.findByText('Create new service', {}, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify placeholder skeleton nodes are successfully rendered
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(15);
  });
});
