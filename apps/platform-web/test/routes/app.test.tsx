import { configure, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, stubLocationAssign } from '../support/render-app';

configure({ asyncUtilTimeout: 8000 });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App Layout Route', () => {
  it('redirects anonymous users to the BFF login URL and encodes the return path', async () => {
    const { replace, restore } = stubLocationAssign();
    mockAuth(null);
    renderApp('/app');

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(expect.stringContaining('/auth/login'));
    });
    const [url] = replace.mock.calls[0] as [string];
    expect(url).toContain('returnTo=');
    restore();
  });

  it('admits authenticated users and renders the console layout shell', async () => {
    mockAuth(authedUser, { workspaces: [] });
    renderApp('/app');

    // Wait for console header (banner) and sidebar navigation to render
    expect(await screen.findByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    // Verify user display name is visible on screen
    expect(screen.getAllByText('Maya Reyes').length).toBeGreaterThan(0);
  });
});
