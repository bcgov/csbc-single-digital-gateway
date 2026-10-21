import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';
import { ConsoleAgreementsList } from '@/components/console/service-agreements/console-agreements-pages';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseParams = vi.fn(() => ({ slug: 'riverton', id: 'a1' }));
const mockUseSearch = vi.fn(() => ({}));
const mockUseNavigate = vi.fn(() => vi.fn());
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useSearch: () => mockUseSearch(),
    useNavigate: () => mockUseNavigate(),
  };
});

// Explicitly import routes to register in the router
import '@/routes/app';
import '@/routes/app.$slug';
import '@/routes/app.$slug.service-agreements';
import '@/routes/app.$slug.service-agreements.index';
import '@/routes/app.$slug.service-agreements.new';
import '@/routes/app.$slug.service-agreements.$id';

// Monaco can't run in jsdom — proxy it with a plain textarea (feature 217: the agreement editor
// is a JSON content editor now, not a JSONForms form).
// Docs 218, 276: the detail page opens a version's content in the Document Studio — see
// `test/support/mock-documents.tsx`.
vi.mock('@repo/documents/studio', async () =>
  (await import('../../../../support/mock-documents')).documentStudioMock(),
);

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

const mockAgreement = {
  id: 'a1',
  workspaceId: 'w1',
  title: 'Workspace TOS',
  kind: 'service-agreement',
  createdAt: ISO,
  status: 'published',
  isGlobal: false,
};

const detailResponse = {
  agreement: {
    id: 'a1',
    workspaceId: 'w1',
    title: 'Workspace TOS',
    type: 'services.service-agreement',
    createdAt: ISO,
  },
  // Doc 225 rule 7: the API always says what may be deleted.
  deletable: { agreement: true, versionIds: [] },
  versions: [
    {
      id: 'v1',
      versionNumber: 1,
      revision: 1,
      status: 'draft',
      title: 'Workspace TOS',
      description: null,
      content: {
        schema: {},
        variants: {
          default: {
            type: 'Form',
            label: 'Workspace TOS',
            elements: [],
            options: { body: 'Workspace agreement content.' },
          },
        },
      },
      createdAt: ISO,
      publishedAt: null,
      archivedAt: null,
    },
  ],
  // Doc 221: each version's template, by `templateVersionId`; this version pins none.
  definitions: {},
  services: [],
};

function setupMocks() {
  const base = mockAuth(authedUser, { workspaces: [riverton] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    // Doc 228: the New agreement picker reads the catalog — one published agreement template.
    if (url.endsWith('/v1/templates')) {
      return json({
        items: [
          {
            template: { id: 'tpl-sa', type: 'services.service-agreement' },
            published: { id: 'tpl-sa-v1', title: 'Service agreement' },
          },
        ],
      });
    }

    // Default agreements for workspace
    if (url.includes('/default-agreements')) {
      return json({ items: [] });
    }

    // List of agreements for workspace
    if (url.includes('/v1/service-agreements')) {
      if (method === 'POST') {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        return json({
          agreement: {
            id: 'a2',
            title: body.data?.title || 'Untitled',
            workspaceId: 'w1',
            createdAt: ISO,
          },
          version: {
            id: 'v2',
            versionNumber: 1,
            status: 'draft',
            content: body.content,
            createdAt: ISO,
          },
        });
      }

      if (url.includes('/v1/service-agreements/a1') || url.includes('/v1/service-agreements/a2')) {
        return json(detailResponse);
      }

      return json({ items: [mockAgreement] });
    }

    return (base as any)(input, init);
  });
  globalThis.fetch = fetchMock as any;
  return fetchMock;
}

describe('Console Agreements  Component Test Suite', () => {
  it('renders ConsoleAgreementsList (agreements list + workspace defaults panel)', async () => {
    setupMocks();
    renderApp('/app/riverton/service-agreements');

    // 1. Verify workspace agreements list renders
    expect(await screen.findByText('Workspace TOS', {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it('renders ConsoleAgreementsNew (Agreements list + New agreement modal)', async () => {
    const fetchMock = setupMocks();
    renderApp('/app/riverton/service-agreements/new');

    // 1. Verify view loads (agreements list renders behind the modal)
    expect(await screen.findByText('Workspace TOS', {}, { timeout: 10000 })).toBeInTheDocument();

    // 2. Verify modal dialog is open
    const modal = await screen.findByRole('dialog', { name: /new service agreement/i });
    expect(modal).toBeInTheDocument();

    // Feature 217: the create modal collects a TITLE only.
    const titleInput = within(modal).getByLabelText(/title/i);
    expect(within(modal).queryByLabelText(/description/i)).toBeNull();
    const createBtn = within(modal).getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'New Custom TOS');
    await userEvent.click(createBtn);

    // Verify POST create endpoint was called
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('renders ConsoleAgreementDetail page', async () => {
    setupMocks();
    renderApp('/app/riverton/service-agreements/a1');

    // Wait for the auth/me query to load and editable elements to render
    expect(
      await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 }),
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Workspace TOS' })).toBeInTheDocument();
    // Doc 218: an editable version opens in the Form Studio, holding that version's document.
    const studio = screen.getByLabelText('document') as HTMLTextAreaElement;
    expect(studio.value).toContain('Workspace TOS');
  });

  it('covers useWorkspaceScope loading state (undefined workspace)', () => {
    mockUseParams.mockReturnValue({ slug: 'riverton', id: 'a1' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ConsoleAgreementsList />
      </QueryClientProvider>,
    );

    // It should render agreements list in empty/loading state
    expect(screen.getByRole('button', { name: /new agreement/i })).toBeDisabled();
    expect(
      screen.getByText('No service agreements yet — create one with the New button.'),
    ).toBeInTheDocument();
  });
});
