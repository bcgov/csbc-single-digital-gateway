import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

// Doc 230 — the service version edit page; doc 281 rules 21-25 (revised 2026-10-08) — a DocumentRunner over the
// DEFAULT variant for a draft, a DocumentView read-back otherwise.

vi.mock('@repo/documents/runner', async () =>
  (await import('../../../../support/mock-documents')).documentRunnerMock(),
);
vi.mock('@repo/documents/studio', async () =>
  (await import('../../../../support/mock-documents')).documentStudioMock(),
);
vi.mock('@repo/documents/view', async () =>
  (await import('../../../../support/mock-documents')).documentViewMock(),
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
  variants: {
    default: { type: 'Form', label, elements: [] },
    // A second variant with another root (doc 275 B1): never what this page shows.
    Staff: { type: 'Funnel', label: `${label} (staff)`, elements: [] },
  },
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
      // Doc 289: the publish dialog's precheck — these cases are about answers, so it always passes.
      if (path.endsWith('/publish-check'))
        return json({
          ok: true,
          hasMethods: true,
          methods: [{ id: 'm1', title: 'Apply online', status: 'draft', problems: [] }],
        });
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

const runner = () => screen.getByTestId('document-runner');
const answersShown = () => JSON.parse(runner().getAttribute('data-answers') ?? '{}') as unknown;
/** Types into the runner stub: the whole answers object, as the real runner reports it. */
const answer = (next: Record<string, unknown>) =>
  fireEvent.change(within(runner()).getByLabelText('answers'), {
    target: { value: JSON.stringify(next) },
  });

describe('ServiceVersionEditor (docs 230, 281 rules 21-25)', () => {
  it('opens a draft in a DocumentRunner over the DEFAULT variant, with its saved answers, Save and Publish', async () => {
    withService([version(1, 'published'), version(2, 'draft', { name: 'Acme' }, 'tv1')]);
    renderApp('/app/riverton/services/s1/versions/sv2/edit');

    await screen.findByTestId('document-runner', undefined, T);
    // Rule 21: the default variant — not the Staff one — and no studio.
    expect(runner()).toHaveTextContent('"label":"v2 content"');
    expect(runner()).not.toHaveTextContent('(staff)');
    expect(screen.queryByTestId('document-studio')).toBeNull();
    expect(runner()).toHaveAttribute('data-disabled', 'false');
    expect(answersShown()).toEqual({ name: 'Acme' });
    // Rule 21a: the runner bar stays (Back / Next) but its Submit is hidden; rule 21b: references handed down.
    expect(runner()).toHaveAttribute('data-actions', 'true');
    expect(runner()).toHaveAttribute('data-submit', 'false');
    // Rule 21c: staff move through a Funnel freely — errors show, never block.
    expect(runner()).toHaveAttribute('data-free-navigation', 'true');
    expect(runner()).toHaveAttribute('data-references', 'true');
    expect(screen.getByRole('heading', { name: 'Permit application' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    // Rule 24: clean is publishable — the API validates the answers.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'New version' })).toBeNull();
  });

  it('shows a published version as a DocumentView read-back of the default variant, with New version', async () => {
    withService([version(1, 'published', { name: 'Acme' })]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');

    const view = await screen.findByTestId('document-view', undefined, T);
    expect(view).toHaveTextContent('"label":"v1 content"');
    expect(view).not.toHaveTextContent('(staff)');
    expect(JSON.parse(view.getAttribute('data-answers') ?? '{}')).toEqual({ name: 'Acme' });
    expect(view).toHaveAttribute('data-unanswered', 'show');
    expect(view).toHaveAttribute('data-references', 'true');
    expect(screen.queryByTestId('document-runner')).toBeNull();
    expect(screen.queryByTestId('document-studio')).toBeNull();
    expect(screen.getByRole('button', { name: 'New version' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('saves the answers beside the UNCHANGED form in one PATCH (rules 22-23)', async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);
    // An empty answers object is no change (rule 22).
    answer({});
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    answer({ name: 'Acme' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/versions/sv1',
        body: { content: content('v1 content', { name: 'Acme' }) },
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    // Doc 289 rule 9: Publish asks first; the dialog's Publish publishes.
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    const dialog = within(await screen.findByRole('dialog'));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Publish' })).toBeEnabled());
    await userEvent.click(dialog.getByRole('button', { name: 'Publish' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', path: '/versions/sv1/publish' }),
    );
  });

  it("the runner's Save draft is the page's Save (rule 21a)", async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);

    answer({ name: 'Draft answer' });
    await userEvent.click(within(runner()).getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/versions/sv1',
        body: { content: content('v1 content', { name: 'Draft answer' }) },
      }),
    );
  });

  it('always sends data, so clearing every answer clears them (rule 23)', async () => {
    const { calls } = withService([version(1, 'draft', { name: 'Acme' })]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);

    answer({});
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
    await screen.findByTestId('document-runner', undefined, T);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    // Doc 289 rule 9: the refusal shows inside the publish dialog.
    const dialog = within(await screen.findByRole('dialog'));
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Publish' })).toBeEnabled());
    await userEvent.click(dialog.getByRole('button', { name: 'Publish' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('name is required');
  });

  it('navigates to a picked version and to a new version', async () => {
    const { calls } = withService([version(1, 'archived'), version(2, 'published')]);
    renderApp('/app/riverton/services/s1/versions/sv2/edit');
    await screen.findByTestId('document-view', undefined, T);

    await userEvent.click(screen.getByRole('button', { name: /version v2/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /v1/ }));
    expect(await screen.findByRole('button', { name: /version v1/i })).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'New version' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: '/versions' }));
    // The new draft is open, and fillable.
    expect(await screen.findByRole('button', { name: /version v3/i })).toBeInTheDocument();
    await screen.findByTestId('document-runner');
    expect(runner()).toHaveAttribute('data-disabled', 'false');
  });

  it('deletes the service and returns to the services list', async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);
    // Unsaved answers: the guard must still not ask to save a deleted service (doc 225 B1).
    answer({ name: 'Unsaved' });
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
    // v1 is published, so the edit page reads it back (and no New version: v2 is already a draft).
    expect(await screen.findByRole('button', { name: /version v1/i }, T)).toBeInTheDocument();
    expect(screen.getAllByTestId('document-view').length).toBeGreaterThan(0);
  });
});
