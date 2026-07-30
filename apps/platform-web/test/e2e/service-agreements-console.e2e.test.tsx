import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-07-07T00:00:00.000Z';
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const workspaceAgreement = {
  id: 'a1',
  workspaceId: 'w1',
  title: 'Terms of service',
  kind: 'service-agreement',
  createdAt: ISO,
  status: 'draft',
  isGlobal: false,
};

const globalAgreement = {
  id: 'g1',
  workspaceId: null,
  title: 'Privacy policy',
  kind: 'service-agreement',
  createdAt: ISO,
  status: 'published',
  isGlobal: true,
};

/** Wrap the shared auth/workspace mock with the /v1/service-agreements list endpoint. */
function withAgreements(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/service-agreements')) {
      const hasWorkspace = url.includes('workspaceId=');
      // Workspace surface lists workspace + global; admin surface (no workspaceId) lists global only.
      return json({
        items: hasWorkspace ? [workspaceAgreement, globalAgreement] : [globalAgreement],
      });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  return fetchMock;
}

describe('Service Agreements Console Integration Test Suite', () => {
  it('opens the New agreement modal (title + description) at /new', async () => {
    withAgreements(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/service-agreements/new');
    const modal = await screen.findByRole(
      'dialog',
      { name: /new service agreement/i },
      { timeout: 32000 },
    );
    expect(within(modal).getByLabelText(/title/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText(/description/i)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /create agreement/i })).toBeInTheDocument();
  });
});
