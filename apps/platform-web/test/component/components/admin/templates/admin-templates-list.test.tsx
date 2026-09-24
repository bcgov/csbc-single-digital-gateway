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

/**
 * Feature 217: a template is a `documents` row, so its NAME is its version's GENERATED title and
 * its `type` replaces the old text `kind`.
 */
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
    type: 'service' | 'application-method' | 'service-agreement';
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

function mockApi(items: Entry[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) {
      return json(adminUser);
    }
    if (url.includes('/v1/admin/templates')) {
      return json({ items });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('AdminTemplatesList', () => {
  it('renders empty state when there are no templates', async () => {
    mockApi([]);
    renderApp('/admin/templates');

    expect(
      await screen.findByText(
        'The template catalog. Open a template to manage its versions.',
        undefined,
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('No templates yet.')).toBeInTheDocument();
  });

  it('renders a list of templates with correct metadata, status summary, and versions count', async () => {
    const entries: Entry[] = [
      {
        template: {
          id: 'dt-published',
          workspaceId: null,
          type: 'application-method',
          createdAt: ISO,
          updatedAt: ISO,
        },
        versions: [
          {
            id: 'dt-published-v1',
            documentId: 'dt-published',
            versionNumber: 1,
            revision: 1,
            status: 'archived',
            title: 'Published Document',
            description: null,
            content: {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: ISO,
          },
          {
            id: 'dt-published-v2',
            documentId: 'dt-published',
            versionNumber: 2,
            revision: 1,
            status: 'published',
            title: 'Published Document',
            description: null,
            content: {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: null,
          },
        ],
      },
      {
        template: {
          id: 'dt-draft',
          workspaceId: null,
          type: 'service',
          createdAt: ISO,
          updatedAt: ISO,
        },
        versions: [
          {
            id: 'dt-draft-v1',
            documentId: 'dt-draft',
            versionNumber: 1,
            revision: 1,
            status: 'draft',
            title: 'Draft Document',
            description: null,
            content: {},
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          },
        ],
      },
      {
        template: {
          id: 'dt-archived',
          workspaceId: null,
          type: 'service-agreement',
          createdAt: ISO,
          updatedAt: ISO,
        },
        versions: [
          {
            id: 'dt-archived-v1',
            documentId: 'dt-archived',
            versionNumber: 1,
            revision: 1,
            status: 'archived',
            title: 'Archived Document',
            description: null,
            content: {},
            createdAt: ISO,
            publishedAt: ISO,
            archivedAt: ISO,
          },
        ],
      },
    ];

    mockApi(entries);
    renderApp('/admin/templates');

    // 1. Verify list elements render. The name is the LATEST version's generated title.
    const linkPublished = await screen.findByRole(
      'link',
      { name: 'Published Document' },
      { timeout: 32000 },
    );
    const linkDraft = screen.getByRole('link', { name: 'Draft Document' });
    const linkArchived = screen.getByRole('link', { name: 'Archived Document' });

    expect(linkPublished).toBeInTheDocument();
    expect(linkPublished).toHaveAttribute('href', '/admin/templates/dt-published');
    expect(linkDraft).toBeInTheDocument();
    expect(linkDraft).toHaveAttribute('href', '/admin/templates/dt-draft');
    expect(linkArchived).toBeInTheDocument();
    expect(linkArchived).toHaveAttribute('href', '/admin/templates/dt-archived');

    // 2. Verify type badges
    expect(screen.getByText('application-method')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
    expect(screen.getByText('service-agreement')).toBeInTheDocument();

    // 3. Verify status mapping (statusSummary function)
    expect(screen.getByText('Published v2')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();

    // 4. Verify version counts
    expect(screen.getByText('2')).toBeInTheDocument(); // Published Document versions count
    expect(screen.getAllByText('1')).toHaveLength(2); // Draft and Archived version counts
  });
});
