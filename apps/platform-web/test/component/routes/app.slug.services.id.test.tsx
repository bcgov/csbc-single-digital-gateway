import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../support/render-app';
import { mockServicesBff } from '../../support/mock-services-bff';

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

describe('App Slug Services ID Layout Route', () => {
  it('renders the child route inside the Outlet for app slug services id layout route', async () => {
    const servicesJson = {
      service: {
        id: 's1',
        workspaceId: 'w1',
        title: 'Permit application',
        description: '',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      versions: [
        {
          id: 'sv1',
          documentId: 's1',
          version: 1,
          status: 'draft',
          data: { title: 'Permit application' },
          createdAt: '2026-06-01T00:00:00.000Z',
          publishedAt: null,
          archivedAt: null,
        },
      ],
      definition: {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', title: 'Title' },
          },
        },
        uischema: {
          type: 'VerticalLayout',
          elements: [{ type: 'Control', scope: '#/properties/title' }],
        },
      },
      hasSubmissions: false,
    };
    mockServicesBff(servicesJson);
    renderApp('/app/riverton/services/s1/');

    // The bare service route renders the console shell's Dashboard child through the $id Outlet.
    expect(
      await screen.findByRole('heading', { name: 'Dashboard' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // The sidebar section nav (a child of the shell) is present.
    expect(screen.getByRole('link', { name: 'Service details' })).toBeInTheDocument();
  });
});
