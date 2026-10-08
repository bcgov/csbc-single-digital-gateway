import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

// Doc 288: /app/$slug/services/$id/versions/$versionId/application-methods/$methodId — an application method in the
// Document Studio (authoring mode). jsdom can't run the studio: see `test/support/mock-documents.tsx`.
vi.mock('@repo/documents/studio', async () =>
  (await import('../../../../support/mock-documents')).documentStudioMock(),
);

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-10-08T00:00:00.000Z';
const T = { timeout: 32000 };
const URL_DRAFT = '/app/riverton/services/s1/versions/sv2/application-methods/f1';
const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin',
  createdAt: ISO,
};

type Status = 'draft' | 'published' | 'archived';
const methodContent = (label: string) => ({
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', label, elements: [] } },
});
const serviceVersion = (n: number, status: Status) => ({
  id: `sv${String(n)}`,
  documentId: 's1',
  templateVersionId: null,
  versionNumber: n,
  revision: 1,
  status,
  title: 'Permit application',
  description: null,
  content: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
  createdAt: ISO,
  publishedAt: status === 'draft' ? null : ISO,
  archivedAt: null,
});

interface Setup {
  methodStatus?: Status;
  serviceStatus?: Status;
  methodExists?: boolean;
  saveError?: string;
  governed?: boolean;
  /** Answer the service this many ms late — after the method, as on a cold load. */
  serviceDelay?: number;
}

/** One service (v1 published, v2 as given) and one application method, whose PATCH persists. */
function withMethod({
  methodStatus = 'draft',
  serviceStatus = 'draft',
  methodExists = true,
  saveError,
  governed = false,
  serviceDelay = 0,
}: Setup = {}) {
  const store = { content: methodContent('Apply online') as Record<string, unknown> };
  const patches: { path: string; body: unknown }[] = [];
  const base = mockAuth(authedUser, { workspaces: [riverton] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/v1/forms/f1')) {
      if (!methodExists) return json({ statusCode: 404, message: 'Form not found' }, 404);
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as { content: Record<string, unknown> };
        patches.push({ path: url.split('/v1/forms/f1')[1] ?? '', body });
        if (saveError !== undefined) return json({ statusCode: 403, message: saveError }, 403);
        store.content = body.content;
        return json(formVersion(methodStatus, store.content));
      }
      return json({
        form: {
          id: 'f1',
          workspaceId: 'w1',
          title: 'Apply online',
          type: 'services.service-application-method',
          createdAt: ISO,
        },
        version: formVersion(methodStatus, store.content),
        ...(governed && {
          definition: {
            schema: {},
            variants: { default: { type: 'Form', label: 'Online form template', elements: [] } },
            capabilities: { default: 'granted' },
          },
        }),
      });
    }
    if (url.includes('/v1/services/s1')) {
      if (serviceDelay > 0) await new Promise((resolve) => setTimeout(resolve, serviceDelay));
      return json({
        service: { id: 's1', workspaceId: 'w1', title: 'Permit application', createdAt: ISO },
        versions: [serviceVersion(1, 'published'), serviceVersion(2, serviceStatus)],
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
  return { patches };
}

function formVersion(status: Status, content: Record<string, unknown>) {
  return {
    id: 'fv1',
    documentId: 'f1',
    versionNumber: 1,
    revision: 1,
    status,
    title: 'Apply online',
    description: null,
    content,
    createdAt: ISO,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const studio = () => screen.getByTestId('document-studio') as HTMLTextAreaElement;
const edit = (label: string) =>
  fireEvent.change(studio(), { target: { value: JSON.stringify(methodContent(label)) } });

describe('ApplicationMethodEditor (doc 288)', () => {
  it('rule 2/10: opens the method in an editable studio as an application method document, governed by its pinned template', async () => {
    withMethod({ governed: true });
    renderApp(URL_DRAFT);

    await screen.findByTestId('document-studio', undefined, T);
    expect(studio().value).toContain('Apply online');
    expect(studio()).toHaveAttribute('data-readonly', 'false');
    expect(studio()).toHaveAttribute('data-fillable', 'false');
    expect(studio()).toHaveAttribute('data-kind', 'document');
    expect(studio()).toHaveAttribute('data-type', 'services.service-application-method');
    expect(studio()).toHaveAttribute('data-governed-by', 'Online form template');
  });

  it('rule 11: shows the method title and status, and a breadcrumb to the service and version', async () => {
    withMethod();
    renderApp(URL_DRAFT);

    expect(await screen.findByRole('heading', { name: 'Apply online' }, T)).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    const crumbs = within(await screen.findByRole('navigation', { name: 'breadcrumb' }, T));
    expect(await crumbs.findByRole('link', { name: 'Permit application' }, T)).toHaveAttribute(
      'href',
      '/app/riverton/services/s1/details',
    );
    expect(crumbs.getByRole('link', { name: 'v2' })).toHaveAttribute(
      'href',
      '/app/riverton/services/s1/versions/sv2/edit',
    );
    expect(crumbs.getByText('Apply online')).toHaveAttribute('aria-current', 'page');
    expect(crumbs.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      '/app/riverton/services',
    );
  });

  it('rule 11: the breadcrumb fills in when the service loads AFTER the method (cold load)', async () => {
    withMethod({ serviceDelay: 300 });
    renderApp(URL_DRAFT);

    const crumbs = within(await screen.findByRole('navigation', { name: 'breadcrumb' }, T));
    expect(await crumbs.findByRole('link', { name: 'Permit application' }, T)).toBeInTheDocument();
    expect(crumbs.getByRole('link', { name: 'v2' })).toBeInTheDocument();
    expect(crumbs.queryByRole('link', { name: 'Version' })).toBeNull();
  });

  it('rules 7-8: Save is disabled while clean, enabled after an edit, and PATCHes the live content', async () => {
    const { patches } = withMethod();
    renderApp(URL_DRAFT);

    await screen.findByTestId('document-studio', undefined, T);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    edit('Apply by mail');
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({
      path: '/versions/fv1',
      body: { content: methodContent('Apply by mail') },
    });
    // The refetch reads back what was saved, so the page is clean again.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled());
  });

  it('rule 8: a refused save shows the API message', async () => {
    withMethod({ saveError: 'The template does not allow this change' });
    renderApp(URL_DRAFT);

    await screen.findByTestId('document-studio', undefined, T);
    edit('Apply by mail');
    const save = screen.getByRole('button', { name: 'Save' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The template does not allow this change',
    );
  });

  it('rule 5: read-only with no Save when the service version is not a draft', async () => {
    withMethod({ serviceStatus: 'published' });
    renderApp(URL_DRAFT);

    await screen.findByTestId('document-studio', undefined, T);
    expect(studio()).toHaveAttribute('data-readonly', 'true');
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('rule 5: read-only with no Save when the method version is not a draft', async () => {
    withMethod({ methodStatus: 'published' });
    renderApp(URL_DRAFT);

    await screen.findByTestId('document-studio', undefined, T);
    expect(studio()).toHaveAttribute('data-readonly', 'true');
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('rule 3: an unknown method shows not found with a link back to the service version', async () => {
    withMethod({ methodExists: false });
    renderApp(URL_DRAFT);

    expect(
      await screen.findByText(/Application method not found/, undefined, T),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the service version' })).toHaveAttribute(
      'href',
      '/app/riverton/services/s1/versions/sv2/edit',
    );
    expect(screen.queryByTestId('document-studio')).toBeNull();
  });

  it('rule 3: an unknown service version shows not found', async () => {
    withMethod();
    renderApp('/app/riverton/services/s1/versions/nope/application-methods/f1');

    expect(
      await screen.findByText(/Application method not found/, undefined, T),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('document-studio')).toBeNull();
  });
});
