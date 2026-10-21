import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

// Doc 289 rules 9-11: Publish on the service version page opens a precheck dialog.
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

const ISO = '2026-10-08T00:00:00.000Z';
const T = { timeout: 32000 };
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};
const PASSING = {
  ok: true,
  hasMethods: true,
  methods: [{ id: 'm1', title: 'Apply online', status: 'draft', problems: [] }],
};

interface Setup {
  check?: unknown;
  checkStatus?: number;
  publishError?: string;
}

/** One draft service version; the precheck and publish answer as each case says. */
function withService({ check = PASSING, checkStatus = 200, publishError }: Setup = {}) {
  const store = { status: 'draft' as 'draft' | 'published' };
  const calls: string[] = [];
  const base = mockAuth(authedUser, { workspaces: [riverton] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/v1/services/s1')) {
      const path = url.split('/v1/services/s1')[1] ?? '';
      calls.push(`${method} ${path}`);
      if (path.endsWith('/publish-check')) return json(check, checkStatus);
      if (path.endsWith('/publish')) {
        if (publishError !== undefined)
          return json({ statusCode: 400, message: publishError }, 400);
        store.status = 'published';
        return json(version(store.status));
      }
      return json({
        service: { id: 's1', workspaceId: 'w1', title: 'Permit application', createdAt: ISO },
        versions: [version(store.status)],
        definition: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
        definitions: {},
        hasSubmissions: false,
        deletable: { service: true, versionIds: [] },
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

function version(status: 'draft' | 'published') {
  return {
    id: 'sv1',
    documentId: 's1',
    templateVersionId: null,
    versionNumber: 1,
    revision: 1,
    status,
    title: 'Permit application',
    description: null,
    content: {
      schema: { type: 'object', properties: {} },
      variants: { default: { type: 'Form', label: 'Permit', elements: [] } },
    },
    createdAt: ISO,
    publishedAt: status === 'published' ? ISO : null,
    archivedAt: null,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function openDialog() {
  renderApp('/app/riverton/services/s1/versions/sv1/edit');
  await screen.findByTestId('document-runner', undefined, T);
  const publish = screen.getByRole('button', { name: 'Publish' });
  await waitFor(() => expect(publish).toBeEnabled());
  await userEvent.click(publish);
  return within(await screen.findByRole('dialog'));
}

const rows = (dialog: ReturnType<typeof within>) =>
  dialog.getAllByRole('listitem').map((row: HTMLElement) => ({
    passed: row.getAttribute('data-passed'),
    text: row.textContent,
  }));

describe('PublishServiceDialog (doc 289)', () => {
  describe('checklist', () => {
    it('Publish on the service version page opens the dialog and fetches the precheck', async () => {
      const { calls } = withService();
      const dialog = await openDialog();

      expect(dialog.getByRole('heading', { name: 'Publish this version?' })).toBeInTheDocument();
      await dialog.findByText('Apply online');
      expect(calls).toContain('GET /versions/sv1/publish-check');
      // Nothing is published by opening it.
      expect(calls).not.toContain('POST /versions/sv1/publish');
    });

    it('lists the has-a-method check and one row per method with its problems and an editor link', async () => {
      withService({
        check: {
          ok: false,
          hasMethods: true,
          methods: [
            { id: 'm1', title: 'Apply online', status: 'draft', problems: [] },
            { id: 'm2', title: 'Apply by mail', status: 'draft', problems: ['Has no fields'] },
            { id: 'm3', title: null, status: null, problems: ['Not found'] },
          ],
        },
      });
      const dialog = await openDialog();
      await dialog.findByText('Apply by mail');

      expect(rows(dialog)).toEqual([
        { passed: 'true', text: 'Passed:Has an application method' },
        { passed: 'true', text: 'Passed:Apply online' },
        { passed: 'false', text: 'Failed:Apply by mailHas no fields' },
        { passed: 'false', text: 'Failed:Untitled application methodNot found' },
      ]);
      expect(dialog.getByRole('link', { name: 'Apply by mail' })).toHaveAttribute(
        'href',
        '/app/riverton/services/s1/versions/sv1/application-methods/m2',
      );
      // A method that wasn't found has nothing to open.
      expect(dialog.queryByRole('link', { name: 'Untitled application method' })).toBeNull();
    });

    it('disables Publish until every check passes', async () => {
      withService({ check: { ok: false, hasMethods: false, methods: [] } });
      const dialog = await openDialog();

      expect(await dialog.findByText('Add at least one application method.')).toBeInTheDocument();
      expect(rows(dialog)).toEqual([
        {
          passed: 'false',
          text: 'Failed:Has an application methodAdd at least one application method.',
        },
      ]);
      expect(dialog.getByRole('button', { name: 'Publish' })).toBeDisabled();
    });

    it('shows the precheck failure and keeps Publish disabled', async () => {
      withService({
        check: { statusCode: 404, message: 'Service version not found' },
        checkStatus: 404,
      });
      const dialog = await openDialog();

      expect(await dialog.findByRole('alert')).toHaveTextContent('Service version not found');
      expect(dialog.getByRole('button', { name: 'Publish' })).toBeDisabled();
    });
  });

  describe('publish', () => {
    it('publishes, closes and refreshes the service on success', async () => {
      const { calls } = withService();
      const dialog = await openDialog();
      const publish = dialog.getByRole('button', { name: 'Publish' });
      await waitFor(() => expect(publish).toBeEnabled());

      await userEvent.click(publish);

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(calls).toContain('POST /versions/sv1/publish');
      // The refetched service shows the published version: no Publish left on the page.
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull());
    });

    it('shows the API refusal inside the dialog', async () => {
      withService({ publishError: 'Apply by mail: Has no fields' });
      const dialog = await openDialog();
      const publish = dialog.getByRole('button', { name: 'Publish' });
      await waitFor(() => expect(publish).toBeEnabled());

      await userEvent.click(publish);

      expect(await dialog.findByRole('alert')).toHaveTextContent('Apply by mail: Has no fields');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
