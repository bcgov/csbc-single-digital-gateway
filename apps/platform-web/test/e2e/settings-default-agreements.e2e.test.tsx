import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, jsonResponse, renderApp } from '../support/render-app';
import { adminWorkspace } from '../support/fixtures';

/** Full-app BFF stub for the workspace Settings screen + the relocated default-agreements panel. */
function mockBff() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return jsonResponse(authedUser);
    if (url.includes('/v1/workspaces/by-slug/')) return jsonResponse(adminWorkspace);
    if (url.includes('/default-agreements')) return jsonResponse({ items: [] });
    if (url.includes('/members') || url.includes('/addable-staff'))
      return jsonResponse({ items: [] });
    if (url.includes('/notifications/unread-count')) return jsonResponse({ count: 0 });
    if (url.includes('/v1/me/notifications'))
      return jsonResponse({ items: [], total: 0, limit: 20, offset: 0 });
    if (url.includes('/v1/workspaces'))
      return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('workspace settings — default agreements section', () => {
  it('Should render the Default agreements panel between General and Danger zone', async () => {
    mockBff();

    renderApp('/app/riverton/settings');

    // CardTitle / the panel heading render styled divs (no heading role) — match by text.
    // "General" also appears in the Settings sub-nav tab (feature 160); take the card title (last).
    const generals = await screen.findAllByText('General', undefined, { timeout: 32000 });
    const general = generals[generals.length - 1]!;
    const defaults = await screen.findByText('Default agreements', undefined, { timeout: 32000 });
    const danger = await screen.findByText('Danger zone', undefined, { timeout: 32000 });

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
