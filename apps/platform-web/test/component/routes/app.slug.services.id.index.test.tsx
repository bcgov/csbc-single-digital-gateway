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

describe('App Slug Services ID Index Route', () => {
  it('renders the service detail page selected on the service details tab', async () => {
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
    createMockServicesBff(servicesJson);
    renderApp('/app/riverton/services/s1/old/edit/');

    // Breadcrumb page title
    expect(
      await screen.findByRole('link', { name: 'Permit application' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Verify service details tab is active
    const detailsTab = screen.getByRole('tab', { name: /Service details/i });
    expect(detailsTab).toHaveAttribute('data-active');

    // Title field
    const titleInput = await screen.findByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('Permit application');

    // Action buttons
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish service/i })).toBeInTheDocument();
  });
});
