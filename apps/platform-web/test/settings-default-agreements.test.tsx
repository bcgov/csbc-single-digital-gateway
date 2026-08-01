import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from './support/render-app';

const ISO = '2026-07-29T00:00:00.000Z';
const workspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  ownerId: 'u1',
  createdAt: ISO,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Full-app BFF stub for the workspace Settings screen + the relocated default-agreements panel. */
function mockBff() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return json(authedUser);
    if (url.includes('/v1/workspaces/by-slug/')) return json(workspace);
    if (url.includes('/default-agreements')) return json({ items: [] });
    if (url.includes('/members') || url.includes('/addable-staff')) return json({ items: [] });
    if (url.includes('/notifications/unread-count')) return json({ count: 0 });
    if (url.includes('/v1/me/notifications'))
      return json({ items: [], total: 0, limit: 20, offset: 0 });
    if (url.includes('/v1/workspaces'))
      return json({ items: [workspace], total: 1, limit: 100, offset: 0 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('workspace settings — default agreements section', () => {
  it('renders the Default agreements panel between General and Danger zone', async () => {
    mockBff();
    renderApp('/app/riverton/settings');

    // CardTitle / the panel heading render styled divs (no heading role) — match by text.
    const general = await screen.findByText('General', undefined, { timeout: 5000 });
    const defaults = await screen.findByText('Default agreements');
    const danger = await screen.findByText('Danger zone');

    // Ordered General → Default agreements → Danger zone in the DOM.
    await waitFor(() => {
      expect(
        general.compareDocumentPosition(defaults) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        defaults.compareDocumentPosition(danger) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });
});
