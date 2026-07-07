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

function withServices(base: ReturnType<typeof mockAuth>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/v1/document-types')) {
      return json({ items: [] });
    }
    if (url.includes('/v1/services')) {
      const rest = url.split('/v1/services')[1]?.split('?')[0] ?? '';
      const segs = rest.split('/').filter(Boolean);
      if (segs[0] === 'definition') {
        return json(definition);
      }
      if (segs[0] === 'forms') {
        return json({
          items: [{ documentId: 'f1', versionId: 'fv1', title: 'Permit form', kind: 'basic-form' }],
        });
      }
      if (segs.length === 0) {
        if (method === 'POST') {
          return json(
            {
              service: {
                id: 's1',
                workspaceId: 'w1',
                title: 'New',
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
              hasSubmissions: true,
              latestPublished: false,
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
          hasSubmissions: true,
        });
      }
      if (segs[segs.length - 1] === 'references') {
        return json({
          items: [
            {
              id: 'ref1',
              relation: 'application_form',
              position: 0,
              label: 'Apply now',
              targetDocumentId: 'f1',
              targetVersionId: 'fv1',
              targetKind: 'basic-form',
              targetTitle: 'Permit form',
              targetVersion: 1,
              targetStatus: 'draft',
              hasSubmissions: false,
              hasStructure: true,
              createdAt: ISO,
            },
          ],
        });
      }
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
    const { router } = renderApp('/app/riverton/services');
    await router.load();
    expect(await screen.findByRole('link', { name: 'Permit application' })).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('opens the New service modal (title + description) at /services/new', async () => {
    withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    const { router } = renderApp('/app/riverton/services/new');
    await router.load();
    const modal = await screen.findByRole('dialog', { name: /new service/i }, { timeout: 8000 });
    expect(within(modal).getByLabelText(/title/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText(/description/i)).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /create service/i })).toBeInTheDocument();
  });

  it('tabs the detail, lists methods, and publishes via the summary modal', async () => {
    const fetchMock = withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    const { router } = renderApp('/app/riverton/services/s1');
    await router.load();
    const user = userEvent.setup();

    // Service details tab (default): the JSONForms title control.
    expect(
      await screen.findByLabelText(/title/i, undefined, { timeout: 8000 }),
    ).toBeInTheDocument();

    // Application methods tab: the method list (count badge + form title).
    await user.click(screen.getByRole('tab', { name: /application methods/i }));
    expect(await screen.findByText('Permit form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add application method/i })).toBeInTheDocument();

    // Publish through the summary modal (no unsaved changes ⇒ the Publish trigger is enabled).
    await user.click(screen.getByRole('tab', { name: /service details/i }));
    await user.click(await screen.findByRole('button', { name: 'Publish service' }));
    const modal = await screen.findByRole('dialog', { name: /publish service/i });
    await user.click(within(modal).getByRole('button', { name: 'Publish' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/services/s1/versions/sv1/publish'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });
});
