import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

// Doc 229 — the service Details section, read-only; doc 282 — through DocumentView.

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
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', label, elements: [] } },
  ...(data === undefined ? {} : { data }),
});
const version = (n: number, status: Status, body: unknown = content(`v${String(n)} content`)) => ({
  id: `sv${String(n)}`,
  documentId: 's1',
  templateVersionId: null,
  versionNumber: n,
  revision: 1,
  status,
  title: 'Permit application',
  description: null,
  content: body,
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

function withService(versions: ReturnType<typeof version>[]) {
  const base = mockAuth(authedUser, { workspaces: [riverton] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/v1/services/s1')) {
      return json({
        service: { id: 's1', workspaceId: 'w1', title: 'Permit application', createdAt: ISO },
        versions,
        definition: { schema: {}, variants: { default: { type: 'Form', elements: [] } } },
        definitions: {},
        hasSubmissions: false,
      });
    }
    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
}

const runner = async () => screen.findByTestId('document-view', undefined, { timeout: 32000 });

describe('ServiceDetailsView (doc 229)', () => {
  it('never shows the placeholder note, even while the service loads', async () => {
    withService([version(1, 'published')]);
    renderApp('/app/riverton/services/s1/details');

    expect(
      await screen.findByRole('heading', { name: 'Service details' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    await runner();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });

  it('shows the latest published version read back with its answers (doc 282 rule 18)', async () => {
    // v2 is published, v3 a newer draft: "current" is the published one.
    withService([
      version(1, 'archived'),
      version(2, 'published', content('v2 content', { name: 'Acme' })),
      version(3, 'draft'),
    ]);
    renderApp('/app/riverton/services/s1/details');

    const view = await runner();
    expect(view).toHaveAttribute('data-answers', JSON.stringify({ name: 'Acme' }));
    // Doc 283 rule 13: a service hides what nobody answered.
    expect(view).toHaveAttribute('data-unanswered', 'hide');
    expect(view).toHaveTextContent('v2 content');
    expect(screen.getByRole('heading', { name: 'Service details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v2/i })).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('reads back the "Staff" variant when the service has one', async () => {
    const staffed = {
      ...content('v1 content', { name: 'Acme' }),
      variants: {
        default: { type: 'Funnel', label: 'Citizen funnel', elements: [] },
        Staff: { type: 'Form', label: 'Staff page', elements: [] },
      },
    };
    withService([version(1, 'published', staffed)]);
    renderApp('/app/riverton/services/s1/details');

    const view = await runner();
    expect(view).toHaveTextContent('Staff page');
    expect(view).not.toHaveTextContent('Citizen funnel');
    expect(view).toHaveAttribute('data-answers', JSON.stringify({ name: 'Acme' }));
  });

  it('reads back the default variant when there is no "Staff" variant', async () => {
    withService([version(1, 'published')]);
    renderApp('/app/riverton/services/s1/details');

    expect(await runner()).toHaveTextContent('v1 content');
  });

  it('falls back to the latest version when none is published', async () => {
    withService([version(1, 'archived'), version(2, 'draft')]);
    renderApp('/app/riverton/services/s1/details');

    expect(await runner()).toHaveTextContent('v2 content');
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('opens the permalink version', async () => {
    withService([version(1, 'archived'), version(2, 'published')]);
    renderApp('/app/riverton/services/s1/versions/sv1/details');

    expect(await runner()).toHaveTextContent('v1 content');
    expect(screen.getByText('archived')).toBeInTheDocument();
  });

  it('says so for an unknown permalink version', async () => {
    withService([version(1, 'published')]);
    renderApp('/app/riverton/services/s1/versions/nope/details');

    expect(
      await screen.findByText(/Version not found/, undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show the current version' })).toHaveAttribute(
      'href',
      '/app/riverton/services/s1/details',
    );
    expect(screen.queryByTestId('document-view')).toBeNull();
  });

  it('says so when the service has no versions', async () => {
    withService([]);
    renderApp('/app/riverton/services/s1/details');

    expect(
      await screen.findByText('This service has no versions yet.', undefined, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('document-view')).toBeNull();
  });

  it('shows an alert for content that is not a document', async () => {
    withService([version(1, 'published', { title: 'a pre-studio row' })]);
    renderApp('/app/riverton/services/s1/details');

    expect(await screen.findByRole('alert', undefined, { timeout: 32000 })).toHaveTextContent(
      'isn’t a document the studio can open',
    );
    expect(screen.queryByTestId('document-view')).toBeNull();
  });

  it('navigates to a version picked from the header', async () => {
    withService([version(1, 'archived'), version(2, 'published')]);
    renderApp('/app/riverton/services/s1/details');
    await runner();

    await userEvent.click(screen.getByRole('button', { name: /version v2/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /v1/ }));

    await waitFor(() =>
      expect(screen.getByTestId('document-view')).toHaveTextContent('v1 content'),
    );
    // `renderApp` routes through memory history, so the permalink shows in what it rendered, not in
    // `window.location`: v1's own status and picker label.
    expect(screen.getByText('archived')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v1/i })).toBeInTheDocument();
  });
});
