import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

// Doc 230 — the service version edit page; doc 281 — it hosts the Document Studio, fillable.

vi.mock('@repo/documents/runner', async () =>
  (await import('../../../../support/mock-documents')).documentRunnerMock(),
);
vi.mock('@repo/documents/studio', async () =>
  (await import('../../../../support/mock-documents')).documentStudioMock(),
);

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-09-28T00:00:00.000Z';
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};

type Status = 'draft' | 'published' | 'archived';
const content = (label: string, data?: Record<string, unknown>) => ({
  schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
  variants: { default: { type: 'Form', label, elements: [] } },
  ...(data === undefined ? {} : { data }),
});
const version = (
  n: number,
  status: Status,
  data?: Record<string, unknown>,
  templateVersionId: string | null = null,
) => ({
  id: `sv${String(n)}`,
  documentId: 's1',
  templateVersionId,
  versionNumber: n,
  revision: 1,
  status,
  title: 'Permit application',
  description: null,
  content: content(`v${String(n)} content`, data),
  createdAt: ISO,
  publishedAt: status === 'draft' ? null : ISO,
  archivedAt: status === 'archived' ? ISO : null,
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A one-service API whose writes mutate the store, as the real endpoints do. */
function withService(
  initial: ReturnType<typeof version>[],
  { publishError }: { publishError?: string } = {},
) {
  const store = { versions: [...initial], exists: true };
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const base = mockAuth(authedUser, { workspaces: [riverton] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/v1/services/s1')) {
      const path = url.split('/v1/services/s1')[1] ?? '';
      if (method !== 'GET') {
        calls.push({
          method,
          path,
          ...(init?.body ? { body: JSON.parse(String(init.body)) as unknown } : {}),
        });
      }
      if (method === 'DELETE' && path === '') {
        store.exists = false;
        return new Response(null, { status: 204 });
      }
      if (method === 'POST' && path === '/versions') {
        const created = version(store.versions.length + 1, 'draft');
        store.versions.push(created);
        return json(created);
      }
      if (method === 'PATCH') {
        // Persist, as the real endpoint does, so the refetch after a save reads back what was saved.
        const target = store.versions.find((v) => path.endsWith(`/${v.id}`));
        if (target) target.content = (JSON.parse(String(init?.body)) as { content: never }).content;
        return json(target);
      }
      if (path.endsWith('/publish'))
        return publishError === undefined
          ? json(store.versions[0])
          : json({ statusCode: 400, message: publishError }, 400);
      if (!store.exists) return new Response(null, { status: 404 });
      const drafts = store.versions.filter((v) => v.status === 'draft').map((v) => v.id);
      return json({
        service: { id: 's1', workspaceId: 'w1', title: 'Permit application', createdAt: ISO },
        versions: store.versions,
        definition: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
        // Doc 281 rule 21: the pinned template's rules govern the studio.
        definitions: {
          tv1: {
            schema: {},
            variants: { default: { type: 'Form', label: 'Permit template', elements: [] } },
            capabilities: { default: 'granted' },
          },
        },
        hasSubmissions: false,
        deletable: { service: true, versionIds: store.versions.length > 1 ? drafts : [] },
      });
    }
    if (url.includes('/v1/services')) return json({ items: [], total: 0, limit: 20, offset: 0 });
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { calls };
}

const T = { timeout: 32000 };

const studio = () => screen.getByTestId('document-studio');
const contentShown = () => JSON.parse((studio() as HTMLTextAreaElement).value) as unknown;
/** Types into the studio stub: the whole content, as the real studio reports it. */
const edit = (next: unknown) =>
  fireEvent.change(studio(), { target: { value: JSON.stringify(next) } });

describe('ServiceVersionEditor (docs 230, 281)', () => {
  it('opens a draft in a fillable studio, with its saved answers, Save and Publish', async () => {
    withService([version(1, 'published'), version(2, 'draft', { name: 'Acme' }, 'tv1')]);
    renderApp('/app/riverton/services/s1/versions/sv2/edit');

    await screen.findByTestId('document-studio', undefined, T);
    expect(studio()).toHaveAttribute('data-fillable', 'true');
    expect(studio()).toHaveAttribute('data-readonly', 'false');
    expect(studio()).toHaveAttribute('data-kind', 'document');
    expect(studio()).toHaveAttribute('data-type', 'services.service');
    expect(studio()).toHaveAttribute('data-governed-by', 'Permit template');
    expect(contentShown()).toEqual(content('v2 content', { name: 'Acme' }));
    expect(screen.queryByTestId('document-runner')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Permit application' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    // Rule 24: clean is publishable — the API validates the answers.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'New version' })).toBeNull();
  });

  it('shows a published version read-only, with its answers and New version', async () => {
    withService([version(1, 'published', { name: 'Acme' })]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');

    await screen.findByTestId('document-studio', undefined, T);
    expect(studio()).toHaveAttribute('data-readonly', 'true');
    expect(contentShown()).toEqual(content('v1 content', { name: 'Acme' }));
    expect(screen.getByRole('button', { name: 'New version' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('saves the studio content — form and answers — in one PATCH', async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-studio', undefined, T);
    // An empty answers object is no change (rule 22).
    edit(content('v1 content', {}));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // A field added AND answered (the user's case): one edit to the content.
    const next = {
      ...content('v1 content', { name: 'Acme', extra: 'yes' }),
      schema: {
        type: 'object',
        properties: { name: { type: 'string' }, extra: { type: 'string' } },
        required: ['name'],
      },
    };
    edit(next);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/versions/sv1',
        body: { content: next },
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', path: '/versions/sv1/publish' }),
    );
  });

  it('always sends data, so clearing every answer clears them (rule 23)', async () => {
    const { calls } = withService([version(1, 'draft', { name: 'Acme' })]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-studio', undefined, T);

    // The studio drops an emptied answers object from the content.
    edit(content('v1 content'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/versions/sv1',
        body: { content: content('v1 content', {}) },
      }),
    );
  });

  it("shows the API's refusal when the answers don't match the form", async () => {
    withService([version(1, 'draft', {})], {
      publishError: "Answers don't match the form: name is required",
    });
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-studio', undefined, T);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('name is required');
  });

  it('navigates to a picked version and to a new version', async () => {
    const { calls } = withService([version(1, 'archived'), version(2, 'published')]);
    renderApp('/app/riverton/services/s1/versions/sv2/edit');
    await screen.findByTestId('document-studio', undefined, T);

    await userEvent.click(screen.getByRole('button', { name: /version v2/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /v1/ }));
    expect(await screen.findByRole('button', { name: /version v1/i })).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'New version' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: '/versions' }));
    // The new draft is open, and fillable.
    expect(await screen.findByRole('button', { name: /version v3/i })).toBeInTheDocument();
    await waitFor(() => expect(studio()).toHaveAttribute('data-readonly', 'false'));
  });

  it('deletes the service and returns to the services list', async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-studio', undefined, T);
    // Unsaved answers: the guard must still not ask to save a deleted service (doc 225 B1).
    edit(content('v1 content', { name: 'Unsaved' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete this service?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete service' }));

    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', path: '' }));
    expect(await screen.findByRole('heading', { name: 'Services' }, T)).toBeInTheDocument();
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it('says so for an unknown version', async () => {
    withService([version(1, 'published')]);
    renderApp('/app/riverton/services/s1/versions/nope/edit');

    expect(await screen.findByText(/Version not found/, undefined, T)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the service details' })).toHaveAttribute(
      'href',
      '/app/riverton/services/s1/details',
    );
  });

  it('links from Details to the shown version with an Edit button', async () => {
    withService([version(1, 'published'), version(2, 'draft')]);
    renderApp('/app/riverton/services/s1/details');

    // Details shows the published v1, so Edit opens v1.
    const editLink = await screen.findByRole('link', { name: 'Edit' }, T);
    expect(editLink).toHaveAttribute('href', '/app/riverton/services/s1/versions/sv1/edit');
    await userEvent.click(editLink);
    // v1 is published, so the edit page shows it read-only (and no New version: v2 is already a draft).
    expect(await screen.findByRole('button', { name: /version v1/i }, T)).toBeInTheDocument();
    expect(screen.getByTestId('document-studio')).toHaveAttribute('data-readonly', 'true');
  });
});
