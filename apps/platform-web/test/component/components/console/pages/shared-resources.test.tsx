import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../../../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SharedResourcesPage Component Test Suite', () => {
  it('renders the hub with a Service Agreements card linking into the section', async () => {
    mockAuth(authedUser, {
      workspaces: [
        {
          id: 'w1',
          slug: 'riverton',
          name: 'Riverton',
          role: 'admin',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    renderApp('/app/riverton/shared-resources');

    expect(
      await screen.findByRole('heading', { name: /shared resources/i }, { timeout: 32000 }),
    ).toBeInTheDocument();

    const link = await screen.findByRole('link', { name: /service agreements/i });
    expect(link).toHaveAttribute('href', '/app/riverton/service-agreements');
  });
});
