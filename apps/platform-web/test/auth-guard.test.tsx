import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, renderApp } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

// The /app console layout is fail-closed: an anonymous visit (GET /auth/me → 401) must consult the
// session and redirect to the BFF login URL before any console UI renders.
describe('console auth guard', () => {
  it('consults /auth/me and renders no console content when there is no session', async () => {
    const fetchMock = mockAuth(null);
    // The guard throws redirect({ href: loginUrl }); jsdom logs an unimplemented-navigation notice
    // for the external href, which is harmless — what matters is that no console content renders.
    renderApp('/app');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({ credentials: 'include' }),
      );
    });

    // The guard blocks the protected Overview from rendering for an anonymous user.
    expect(screen.queryByText(/Overview is being set up/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Maya Reyes/ })).not.toBeInTheDocument();
  });
});
