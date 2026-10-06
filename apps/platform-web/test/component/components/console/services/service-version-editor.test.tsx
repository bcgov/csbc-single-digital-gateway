import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

// Doc 230 — the service version edit page.

vi.mock('@repo/documents/runner', async () =>
  (await import('../../../../support/mock-documents')).documentRunnerMock(),
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
const version = (n: number, status: Status, data?: Record<string, unknown>) => ({
  id: `sv${String(n)}`,
  documentId: 's1',
  templateVersionId: null,
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
function withService(initial: ReturnType<typeof version>[]) {
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
      if (path.endsWith('/publish')) return json(store.versions[0]);
      if (!store.exists) return new Response(null, { status: 404 });
      const drafts = store.versions.filter((v) => v.status === 'draft').map((v) => v.id);
      return json({
        service: { id: 's1', workspaceId: 'w1', title: 'Permit application', createdAt: ISO },
        versions: store.versions,
        definition: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
        definitions: {},
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

describe('ServiceVersionEditor (doc 230)', () => {
  const answersBox = () => screen.getByRole('textbox', { name: 'answers' });
  const type = (answers: Record<string, unknown>) =>
    fireEvent.change(answersBox(), { target: { value: JSON.stringify(answers) } });

  it('opens a draft in a fillable runner, with its saved answers, Save and Publish', async () => {
    withService([version(1, 'published'), version(2, 'draft', { name: 'Acme' })]);
    renderApp('/app/riverton/services/s1/versions/sv2/edit');

    const runner = await screen.findByTestId('document-runner', undefined, T);
    expect(runner).toHaveAttribute('data-disabled', 'false');
    // Rule 2: the header owns Save / Publish, so the runner's own bar is left out.
    expect(runner).toHaveAttribute('data-actions', 'false');
    expect(runner).toHaveAttribute('data-answers', JSON.stringify({ name: 'Acme' }));
    expect(screen.queryByTestId('document-studio')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Permit application' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    // Clean and valid: publishable.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    expect(screen.queryByRole('button', { name: 'New version' })).toBeNull();
  });

  it('shows a published version read-only, with its answers and New version', async () => {
    withService([version(1, 'published', { name: 'Acme' })]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');

    const runner = await screen.findByTestId('document-runner', undefined, T);
    expect(runner).toHaveAttribute('data-disabled', 'true');
    expect(runner).toHaveAttribute('data-answers', JSON.stringify({ name: 'Acme' }));
    expect(screen.getByRole('button', { name: 'New version' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('saves the answers into content.data, keeping the form', async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);

    type({ name: 'Acme' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
    // Dirty: publishing would publish something other than what is saved.
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/versions/sv1',
        body: { content: content('v1 content', { name: 'Acme' }) },
      }),
    );
    // The refetch reads back what was saved: clean, valid, publishable.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'POST', path: '/versions/sv1/publish' }),
    );
  });

  it('keeps Publish off while a saved draft does not validate', async () => {
    // Saved, so clean — but `name` is required and missing.
    withService([version(1, 'draft', {})]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('navigates to a picked version and to a new version', async () => {
    const { calls } = withService([version(1, 'archived'), version(2, 'published')]);
    renderApp('/app/riverton/services/s1/versions/sv2/edit');
    await screen.findByTestId('document-runner', undefined, T);

    await userEvent.click(screen.getByRole('button', { name: /version v2/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /v1/ }));
    expect(await screen.findByRole('button', { name: /version v1/i })).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'New version' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: '/versions' }));
    // The new draft is open, and fillable.
    expect(await screen.findByRole('button', { name: /version v3/i })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'answers' })).toBeInTheDocument();
  });

  it('deletes the service and returns to the services list', async () => {
    const { calls } = withService([version(1, 'draft')]);
    renderApp('/app/riverton/services/s1/versions/sv1/edit');
    await screen.findByTestId('document-runner', undefined, T);
    // Unsaved answers: the guard must still not ask to save a deleted service (doc 225 B1).
    fireEvent.change(screen.getByRole('textbox', { name: 'answers' }), {
      target: { value: JSON.stringify({ name: 'Unsaved' }) },
    });
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
    const edit = await screen.findByRole('link', { name: 'Edit' }, T);
    expect(edit).toHaveAttribute('href', '/app/riverton/services/s1/versions/sv1/edit');
    await userEvent.click(edit);
    // v1 is published, so the edit page shows it read-only (and no New version: v2 is already a draft).
    expect(await screen.findByRole('button', { name: /version v1/i }, T)).toBeInTheDocument();
    expect(screen.getByTestId('document-runner')).toHaveAttribute('data-disabled', 'true');
  });
});
