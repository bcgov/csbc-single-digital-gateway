import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initials, roleLabel } from '@/lib/auth';
import { authedUser, mockAuth, renderApp, stubLocationAssign } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('console auth presentation helpers', () => {
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

describe('console shell — profile card on real /auth/me data', () => {
  it('renders the signed-in user name, role and initials in the sidebar', async () => {
    mockAuth(authedUser);
    renderApp('/app');

    const profile = await screen.findByRole('button', { name: /Maya Reyes/ });
    expect(within(profile).getByText('Staff')).toBeInTheDocument();
    expect(within(profile).getByText('MR')).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('logs out via the profile menu and returns to home', async () => {
    mockAuth(authedUser);
    const location = stubLocationAssign();
    renderApp('/app');

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Maya Reyes/ }));
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
  it('renders sidebar destinations as anchors to their /app routes', async () => {
    mockAuth(authedUser);
    renderApp('/app');

    await screen.findByRole('button', { name: /Maya Reyes/ });
    const cases: Array<[string, string]> = [
      ['Overview', '/app'],
      ['Services', '/app/services'],
      ['Applications', '/app/applications'],
      ['Submissions', '/app/submissions'],
      ['Team', '/app/team'],
      ['Reports', '/app/reports'],
      ['Settings', '/app/settings'],
    ];
    for (const [label, href] of cases) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });
});
