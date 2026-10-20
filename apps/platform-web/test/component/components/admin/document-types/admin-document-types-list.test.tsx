import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';
import { ISO } from '../../../../support/fixtures';
import { mockDocumentTypesBff } from '../../../../support/mock-document-types-bff';

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('AdminDocumentTypesList', () => {
  it('Should render empty state when there are no document types', async () => {
    mockDocumentTypesBff({ items: [] });
    renderApp('/admin/document-types');

    expect(
      await screen.findByText(
        'The document type catalog. Open a type to manage its versions.',
        undefined,
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText('No document types yet.')).toBeInTheDocument();
  });

  it('Should render a list of document types with correct metadata, status summary, and versions count', async () => {
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

    mockDocumentTypesBff({ items: entries });
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
