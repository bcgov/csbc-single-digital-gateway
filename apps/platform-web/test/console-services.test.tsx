import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from './support/render-app';

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};

// Title-only here — the rich-text "about" control is exercised in @repo/ui + @repo/react tests; this
// app-level test focuses on the services UI (form render + lifecycle) without the heavy Lexical editor.
const definition = {
  schema: {
    type: 'object',
    required: ['title'],
    properties: { title: { type: 'string', title: 'Title' } },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/title' }],
  },
};

const draftVersion = {
  id: 'sv1',
  documentId: 's1',
  version: 1,
  status: 'draft' as const,
  data: { title: 'Permit application' },
  createdAt: ISO,
  publishedAt: null,
  archivedAt: null,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Layer `/v1/services` handling over the base auth/workspaces mock. */
function withServices(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/v1/services')) {
      const rest = url.split('/v1/services')[1]?.split('?')[0] ?? '';
      const segs = rest.split('/').filter(Boolean);
      if (segs.length === 0) {
        if (method === 'POST') {
          return json(
            {
              service: {
                id: 's1',
                workspaceId: 'w1',
                title: 'Parking permit',
                description: '',
                createdAt: ISO,
              },
              versions: [draftVersion],
            },
            201,
          );
        }
        return json({
          items: [
            {
              id: 's1',
              workspaceId: 'w1',
              title: 'Permit application',
              description: '',
              createdAt: ISO,
              status: 'draft',
              versionCount: 1,
            },
          ],
        });
      }
      if (segs.length === 1) {
        return json({
          service: {
            id: 's1',
            workspaceId: 'w1',
            title: 'Permit application',
            description: '',
            createdAt: ISO,
          },
          versions: [draftVersion],
          definition,
        });
      }
      // versions ops (PATCH save, POST publish/archive) — echo a version back.
      return json(draftVersion);
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('console services', () => {
  it('lists a workspace’s services', async () => {
    withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services');

    expect(await screen.findByRole('link', { name: 'Permit application' })).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('creates a service from the dialog', async () => {
    const fetchMock = withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /new service/i }));
    const dialog = await screen.findByRole('dialog', { name: /new service/i });
    await user.type(within(dialog).getByLabelText('Title'), 'Parking permit');
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/v1\/services$/),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });

  it('renders the form and publishes a draft', async () => {
    const fetchMock = withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/s1');
    const user = userEvent.setup();

    // The detail route lazily pulls in @repo/react/jsonforms (+ Lexical); allow for that first compile.
    // The Service form renders via JsonForms — the required Title control is labelled "Title *".
    expect(
      await screen.findByLabelText(/title/i, undefined, { timeout: 8000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/services/s1/versions/sv1/publish'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });
});
