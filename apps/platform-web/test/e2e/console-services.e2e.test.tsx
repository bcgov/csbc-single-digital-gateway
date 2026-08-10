import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp, type WorkspaceLike } from '../support/render-app';

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
                updatedAt: ISO,
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
              updatedAt: ISO,
              status: 'draft',
              versionCount: 1,
              hasSubmissions: true,
              latestPublished: false,
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
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
            updatedAt: ISO,
          },
          versions: [draftVersion],
          definition,
          hasSubmissions: true,
        });
      }
      if (segs[segs.length - 1] === 'agreements') {
        return json({ items: [] });
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

describe('Console Services Integration Test Suite', () => {
  it('lists a workspace’s services', async () => {
    withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/');
    expect(
      await screen.findByRole('link', { name: /permit application/i }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('requests the paged list with the default sort', async () => {
    const fetchMock = withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services');
    await screen.findByRole('link', { name: /permit application/i }, { timeout: 32000 });

    // Default list request carries the paging window + default sort (no search/sort UI anymore).
    const listCall = (predicate: (url: string) => boolean) =>
      fetchMock.mock.calls.some(([input]) => {
        const url = String(input);
        return url.includes('/v1/services?') && predicate(url);
      });
    expect(listCall((url) => url.includes('sort=updated') && url.includes('limit=20'))).toBe(true);
  });

  it('opens the New service modal (title + description) from the services list New button', async () => {
    withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services');
    const user = userEvent.setup();

    const newButton = await screen.findByRole('button', { name: /^new$/i }, { timeout: 32000 });
    await waitFor(() => expect(newButton).toBeEnabled());
    await user.click(newButton);

    // The modal + its JSONForms bundle are lazy-loaded on click — allow for the first compile.
    const modal = await screen.findByRole('dialog', { name: /new service/i }, { timeout: 32000 });
    expect(within(modal).getByLabelText(/name of the service/i)).toBeInTheDocument();
    expect(within(modal).getByLabelText('Short description')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /create service/i })).toBeInTheDocument();
  });

  it('tabs the detail, lists methods, and publishes via the summary modal', async () => {
    const fetchMock = withServices(mockAuth(authedUser, { workspaces: [riverton] }));
    renderApp('/app/riverton/services/s1/old/edit');
    const user = userEvent.setup();

    // Service details tab (default): the JSONForms title control.
    expect(
      await screen.findByLabelText(/title/i, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();

    // Application methods tab: the method list (count badge + form title).
    await user.click(screen.getByRole('tab', { name: /application methods/i }));
    expect(await screen.findByText('Permit form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add application method/i })).toBeInTheDocument();

    // Service agreements tab: a count badge (0) + its panel (empty state) — guards the tab wiring.
    expect(screen.getByRole('tab', { name: /service agreements\s*0/i })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /service agreements/i }));
    expect(await screen.findByText(/no agreements attached to this service/i)).toBeInTheDocument();

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
