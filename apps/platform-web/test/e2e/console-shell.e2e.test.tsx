import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initials, roleLabel } from '@/lib/auth';
import { authedUser, mockAuth, renderApp, stubLocationAssign } from '../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Console Shell Integration Test Suite', () => {
  it('derives avatar initials from the first two words of a name', () => {
    expect(initials('Maya Reyes')).toBe('MR');
    expect(initials('madonna')).toBe('M');
    expect(initials('  ')).toBe('?');
  });

  it('formats the first role as a Title-cased label, falling back to Member', () => {
    expect(roleLabel(['staff'])).toBe('Staff');
    expect(roleLabel(['admin', 'staff'])).toBe('Admin');
    expect(roleLabel([])).toBe('Member');
  });
});

describe('console shell — account menu on real /auth/me data', () => {
  it('shows initials on the top-bar avatar, with name + role inside the menu', async () => {
    mockAuth(authedUser);
    renderApp('/app');

    const trigger = await screen.findByRole(
      'button',
      { name: /account menu/i },
      { timeout: 32000 },
    );
    // Initials render on the avatar trigger itself.
    expect(within(trigger).getByText('MR')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(trigger);
    expect(await screen.findByText('Maya Reyes')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('logs out via the account menu and returns to home', async () => {
    mockAuth(authedUser);
    const location = stubLocationAssign();
    renderApp('/app');

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /account menu/i }));
    await user.click(await screen.findByRole('menuitem', { name: /log out/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/'));
    location.restore();
  });
});

describe('console shell — navigation uses real router links', () => {
  it('renders the top-bar destinations as anchors scoped to the active workspace', async () => {
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
    renderApp('/app/riverton');

    await screen.findByRole('button', { name: /account menu/i });
    const cases: Array<[string, string]> = [
      ['Overview', '/app/riverton'],
      ['Services', '/app/riverton/services'],
      ['Service Requests', '/app/riverton/submissions'],
      ['Shared Resources', '/app/riverton/shared-resources'],
      ['Settings', '/app/riverton/settings'],
    ];
    for (const [label, href] of cases) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });
});
