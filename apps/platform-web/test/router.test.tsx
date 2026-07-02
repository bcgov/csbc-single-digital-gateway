import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('platform-web router', () => {
  it('resolves the landing route at / for anonymous visitors', async () => {
    mockAuth(null);
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: 'Single Digital Gateway Platform' }),
    ).toBeInTheDocument();
  });

  it('redirects a signed-in visitor from / to the console', async () => {
    mockAuth(authedUser);
    const { router } = renderApp('/');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/app');
    });
    expect(
      screen.queryByRole('heading', { name: 'Single Digital Gateway Platform' }),
    ).not.toBeInTheDocument();
  });
});
