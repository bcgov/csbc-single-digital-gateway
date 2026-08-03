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
    kind: 'service-agreement',
    createdAt: ISO,
  },
  versions: [
    {
      id: 'v1',
      version: 1,
      status: 'draft',
      data: {
        title: 'Global Privacy Policy',
        body: 'This is the draft agreement content.',
      },
      createdAt: ISO,
      publishedAt: null,
      archivedAt: null,
    },
  ],
  definition: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
    },
    uischema: {},
  },
  services: [],
};

function setupMocks() {
  const base = mockAuth(adminUser);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/v1/service-agreements')) {
      if (method === 'POST') {
        const body = init?.body
          ? (JSON.parse(String(init.body)) as { data: { title: string } })
          : { data: { title: '' } };
        const newAgreement = {
          id: 'g2',
          workspaceId: null,
          title: body.data.title || 'Untitled',
          kind: 'service-agreement',
          createdAt: ISO,
        };
        const newVersion = {
          id: 'v2',
          version: 1,
          status: 'draft',
          data: body.data,
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

    const titleInput = within(modal).getByLabelText(/title/i);
    const descInput = within(modal).getByLabelText(/description/i);
    const createBtn = within(modal).getByRole('button', { name: /create agreement/i });

    await userEvent.type(titleInput, 'New Global TOS');
    await userEvent.type(descInput, 'Description for New Global TOS');
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
    expect(await screen.findByText('Global Privacy Policy')).toBeInTheDocument();
    expect(await screen.findByText(/Version v1/)).toBeInTheDocument();
  });

  it('AdminAgreementsList renders list of admin service agreements', async () => {
    setupMocks();
    renderApp('/admin/service-agreements');

    // Verify it renders the agreements list header and items
    expect(await screen.findByText('Global Privacy Policy')).toBeInTheDocument();
  });
});
