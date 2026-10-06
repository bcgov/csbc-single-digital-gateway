import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../support/render-app';
import { createMockServicesBff } from '../../support/create-mock-services-bff';

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

describe('App Slug Services Index Route', () => {
  it('renders the services list page correctly', async () => {
    const servicesJson = {
      items: [
        {
          id: 's1',
          workspaceId: 'w1',
          title: 'Permit application',
          description: '',
          status: 'draft',
          versionCount: 1,
          hasSubmissions: false,
          latestPublished: false,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    };
    createMockServicesBff(servicesJson);
    renderApp('/app/riverton/services/');

    // Verify page header and layout
    expect(
      await screen.findByRole('button', { name: /^New$/i }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify services are listed as cards (title + status badge).
    expect(await screen.findByText('Permit application')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });
});
