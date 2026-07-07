import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

// cmdk is jsdom-hostile (see @repo/ui testing notes): assert render-safety + a11y, not deep
// keyboard interaction. The command palette must open from the header search and list the
// console's eight jump destinations so they are reachable by name.
describe('command palette', () => {
  it('opens from the header search button and lists the console destinations', async () => {
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
    const { router } = renderApp('/app/riverton');
    await router.load();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /search/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Submissions')).toBeInTheDocument();
    expect(within(dialog).getByText('Reports')).toBeInTheDocument();
    expect(within(dialog).getByText('Account')).toBeInTheDocument();
  });
});
