import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../../../support/render-app';

// Explicitly import the routes to make sure they are registered in the test runner
import '@/routes/admin';
import '@/routes/admin.service-agreements';
import '@/routes/admin.service-agreements.index';
import '@/routes/admin.service-agreements.new';
import '@/routes/admin.service-agreements.$id';

// Docs 218, 276: the detail page opens a version's content in the Document Studio — see
// `test/support/mock-documents.tsx`. Without the stub the real studio also draws the document's title, so this
// file's `getByText('Global Privacy Policy')` matches the page heading AND the form title.
vi.mock('@repo/documents/studio', async () =>
  (await import('../../../../support/mock-documents')).documentStudioMock(),
);

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-07-07T00:00:00.000Z';

// Use the exact adminUser shape that the admin shell tests use
const adminUser = { ...authedUser, roles: ['admin'] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const globalAgreement = {
  id: 'g1',
  workspaceId: null,
  title: 'Global Privacy Policy',
  kind: 'service-agreement',
  createdAt: ISO,
  status: 'published',
  isGlobal: true,
};

const detailResponse = {
  agreement: {
    id: 'g1',
    workspaceId: null,
    title: 'Global Privacy Policy',
    type: 'services.service-agreement',
    createdAt: ISO,
  },
  // Doc 225 rule 7: the API always says what may be deleted; the console renders from it.
  deletable: { agreement: true, versionIds: [] },
  versions: [
    {
      id: 'v1',
      versionNumber: 1,
      revision: 1,
      status: 'draft',
      title: 'Global Privacy Policy',
      description: null,
      content: {
        schema: {},
        variants: {
          default: {
            type: 'Form',
            label: 'Global Privacy Policy',
            elements: [],
            options: { body: 'This is the draft agreement content.' },
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
  const base = mockAuth(adminUser);
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

    if (url.includes('/v1/service-agreements')) {
      if (method === 'POST') {
        const body = init?.body
          ? (JSON.parse(String(init.body)) as { title: string })
          : { title: '' };
        const newAgreement = {
          id: 'g2',
          workspaceId: null,
          title: body.title || 'Untitled',
          type: 'services.service-agreement',
          createdAt: ISO,
        };
        const newVersion = {
          id: 'v2',
          versionNumber: 1,
          revision: 1,
          status: 'draft',
          title: body.title,
          description: null,
          content: {
            schema: {},
            variants: { default: { type: 'Form', label: body.title, elements: [] } },
          },
          createdAt: ISO,
          publishedAt: null,
          archivedAt: null,
        };
        return json({ agreement: newAgreement, version: newVersion });
      }

      if (url.includes('/v1/service-agreements/g1') || url.includes('/v1/service-agreements/g2')) {
        return json(detailResponse);
      }

      // Default list call
      return json({
        items: [globalAgreement],
      });
    }

    const res = await (
      base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>
    )(input, init);
    return res;
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Admin Agreements Pages Component Test Suite', () => {
  it('AdminAgreementsNew opens the New agreement modal and allows creating one', async () => {
    const fetchMock = setupMocks();
    renderApp('/admin/service-agreements/new');

    const modal = await screen.findByRole(
      'dialog',
      { name: /new service agreement/i },
      { timeout: 32000 },
    );
    expect(modal).toBeInTheDocument();

    // Feature 217: the create modal collects a TITLE only.
    const titleInput = within(modal).getByLabelText(/title/i);
    expect(within(modal).queryByLabelText(/description/i)).toBeNull();
    const createBtn = within(modal).getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'New Global TOS');
    await userEvent.click(createBtn);

    // Verify it sent a POST to create agreement
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('AdminAgreementDetail renders details of a specific agreement version', async () => {
    setupMocks();
    renderApp('/admin/service-agreements/g1');

    // Wait for the detail content to load (which would display editor details or title)
    expect(
      await screen.findByText('Global Privacy Policy', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Version v1/, {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it('AdminAgreementsList renders list of admin service agreements', async () => {
    setupMocks();
    renderApp('/admin/service-agreements');

    // Verify it renders the agreements list header and items
    expect(
      await screen.findByText('Global Privacy Policy', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });
});
