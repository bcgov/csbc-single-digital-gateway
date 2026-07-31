import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';

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
  typeId: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  definition: Record<string, unknown>;
  createdAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}

interface Entry {
  type: { id: string; workspaceId: null; name: string; kind: string; createdAt: string };
  versions: Version[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(items: Entry[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) {
      return json(adminUser);
    }
    if (url.includes('/v1/admin/document-types')) {
      return json({ items });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('AdminDocumentTypesList', () => {
  it('renders empty state when there are no document types', async () => {
    mockApi([]);
    renderApp('/admin/document-types');

    expect(
      await screen.findByText('The document type catalog. Open a type to manage its versions.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No document types yet.')).toBeInTheDocument();
  });

  it('renders a list of document types with correct metadata, status summary, and versions count', async () => {
    const entries: Entry[] = [
      {
        type: {
          id: 'dt-published',
          workspaceId: null,
          name: 'Published Document',
          kind: 'basic-form',
          createdAt: ISO,
        },
        versions: [
          {
            id: 'dt-published-v1',
            typeId: 'dt-published',
            version: 1,
            status: 'archived',
            definition: {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: ISO,
          },
          {
            id: 'dt-published-v2',
            typeId: 'dt-published',
            version: 2,
            status: 'published',
            definition: {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: null,
          },
        ],
      },
      {
        type: {
          id: 'dt-draft',
          workspaceId: null,
          name: 'Draft Document',
          kind: 'multi-stage-form',
          createdAt: ISO,
        },
        versions: [
          {
            id: 'dt-draft-v1',
            typeId: 'dt-draft',
            version: 1,
            status: 'draft',
            definition: {},
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          },
        ],
      },
      {
        type: {
          id: 'dt-archived',
          workspaceId: null,
          name: 'Archived Document',
          kind: 'basic-form',
          createdAt: ISO,
        },
        versions: [
          {
            id: 'dt-archived-v1',
            typeId: 'dt-archived',
            version: 1,
            status: 'archived',
            definition: {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: ISO,
          },
        ],
      },
    ];

    mockApi(entries);
    renderApp('/admin/document-types');

    // 1. Verify list elements render
    const linkPublished = await screen.findByRole(
      'link',
      { name: 'Published Document' },
      { timeout: 32000 },
    );
    const linkDraft = screen.getByRole('link', { name: 'Draft Document' });
    const linkArchived = screen.getByRole('link', { name: 'Archived Document' });

    expect(linkPublished).toBeInTheDocument();
    expect(linkPublished).toHaveAttribute('href', '/admin/document-types/dt-published');
    expect(linkDraft).toBeInTheDocument();
    expect(linkDraft).toHaveAttribute('href', '/admin/document-types/dt-draft');
    expect(linkArchived).toBeInTheDocument();
    expect(linkArchived).toHaveAttribute('href', '/admin/document-types/dt-archived');

    // 2. Verify kind badges
    const kindBadges = screen.getAllByText(/form/i);
    expect(kindBadges).toHaveLength(3);
    expect(screen.getAllByText('basic-form')).toHaveLength(2);
    expect(screen.getByText('multi-stage-form')).toBeInTheDocument();

    // 3. Verify status mapping (statusSummary function)
    expect(screen.getByText('Published v2')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();

    // 4. Verify version counts
    expect(screen.getByText('2')).toBeInTheDocument(); // Published Document versions count
    expect(screen.getAllByText('1')).toHaveLength(2); // Draft and Archived version counts
  });
});
