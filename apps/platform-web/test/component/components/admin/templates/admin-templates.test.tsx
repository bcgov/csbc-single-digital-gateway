import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';

import '@/routes/admin';
import '@/routes/admin.document-types';
import '@/routes/admin.document-types.index';
import '@/routes/admin.document-types.$id';

// Monaco can't run in jsdom — proxy it with a plain textarea.
// Doc 218: the detail page opens a version's content in the studio or a disabled runner, neither of which runs in
// jsdom — see `test/support/mock-forms.tsx`.
vi.mock('@repo/forms/studio', async () =>
  (await import('../../../../support/mock-forms')).formStudioMock(),
);
vi.mock('@repo/forms/runner', async () =>
  (await import('../../../../support/mock-forms')).formRunnerMock(),
);

afterEach(() => {
  vi.restoreAllMocks();
});

const ISO = '2026-06-01T00:00:00.000Z';
const adminUser = {
  id: 'u1',
  roles: ['admin'],
  claims: { sub: 'u1', name: 'Maya Reyes', email: 'maya.reyes@riverton.gov' },
};

interface Version {
  id: string;
  documentId: string;
  versionNumber: number;
  revision: number;
  status: 'draft' | 'published' | 'archived';
  title: string | null;
  description: string | null;
  content: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

interface Entry {
  template: {
    id: string;
    workspaceId: null;
    type: 'application-method';
    createdAt: string;
    updatedAt: string;
  };
  versions: Version[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(initial: Entry[]): { store: Entry[]; fetchMock: ReturnType<typeof vi.fn> } {
  const store: Entry[] = structuredClone(initial);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/auth/me')) {
      return json(adminUser);
    }
    if (url.includes('/v1/admin/templates')) {
      const rest = url.split('/v1/admin/templates')[1]?.split('?')[0] ?? '';
      const segs = rest.split('/').filter(Boolean);
      if (segs.length === 0) {
        return json({ items: store });
      }
      const entry = store.find((e) => e.template.id === decodeURIComponent(segs[0]!));
      if (!entry) {
        return new Response(null, { status: 404 });
      }
      if (segs.length === 1) {
        return json(entry);
      }
      const version = entry.versions.find((v) => v.id === decodeURIComponent(segs[2] ?? ''));
      if (version && method === 'POST' && segs[3] === 'publish') {
        for (const v of entry.versions) {
          if (v.status === 'published') {
            v.status = 'archived';
            v.archivedAt = ISO;
          }
        }
        version.status = 'published';
        version.publishedAt = ISO;
        return json(version);
      }
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { store, fetchMock };
}

const basicEntry: Entry = {
  template: {
    id: 'dt-1',
    workspaceId: null,
    type: 'application-method',
    createdAt: ISO,
    updatedAt: ISO,
  },
  versions: [
    {
      id: 'dt-1-v1',
      documentId: 'dt-1',
      versionNumber: 1,
      revision: 1,
      status: 'published',
      title: 'Basic Form',
      description: null,
      content: { uischema: { type: 'Form', label: 'Basic Form', elements: [] } },
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
  ],
};

describe('admin templates', () => {
  it('lists templates with status', async () => {
    mockApi([basicEntry]);
    renderApp('/admin/templates');

    expect(
      await screen.findByRole('link', { name: 'Basic Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Published v1')).toBeInTheDocument();
  });

  it('does not offer a create-template action', async () => {
    mockApi([basicEntry]);
    renderApp('/admin/templates');

    await screen.findByRole('link', { name: 'Basic Form' });
    expect(screen.queryByRole('button', { name: /new template/i })).not.toBeInTheDocument();
  });

  it('publishes a draft version from the detail page', async () => {
    const draftEntry: Entry = {
      ...basicEntry,
      versions: [{ ...basicEntry.versions[0]!, status: 'draft', publishedAt: null }],
    };
    const { fetchMock } = mockApi([draftEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Publish' }, { timeout: 10000 }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/templates/dt-1/versions/dt-1-v1/publish'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });
});
