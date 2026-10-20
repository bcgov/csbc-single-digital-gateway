import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';
import { ISO } from '../../../../support/fixtures';
import { mockDocumentTypesBff, type Entry } from '../../../../support/mock-document-types-bff';

import '@/routes/admin';
import '@/routes/admin.document-types';
import '@/routes/admin.document-types.index';
import '@/routes/admin.document-types.$id';

// Monaco can't run in jsdom — proxy it with a plain textarea.
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea aria-label="definition" value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

// The detail page's live preview renders through JSONForms (heavy) — stub it (covered in @repo/react).
vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: () => <div data-testid="jsonforms" />,
}));
vi.mock('@repo/react/jsonforms-renderers-display', () => ({ displayRenderers: [] }));

afterEach(() => {
  vi.restoreAllMocks();
});

const basicEntry: Entry = {
  type: { id: 'dt-1', workspaceId: null, name: 'Basic Form', kind: 'basic-form', createdAt: ISO },
  versions: [
    {
      id: 'dt-1-v1',
      typeId: 'dt-1',
      version: 1,
      status: 'published',
      definition: { name: 'x' },
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
  ],
};

describe('admin document types', () => {
  it('Should list document types with status', async () => {
    mockDocumentTypesBff({ items: [basicEntry] });
    renderApp('/admin/document-types');

    expect(
      await screen.findByRole('link', { name: 'Basic Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Published v1')).toBeInTheDocument();
  });

  it('Should not offer a create-document-type action', async () => {
    mockDocumentTypesBff({ items: [basicEntry] });
    renderApp('/admin/document-types');

    await screen.findByRole('link', { name: 'Basic Form' });
    expect(screen.queryByRole('button', { name: /new document type/i })).not.toBeInTheDocument();
  });

  it('Should publish a draft version from the detail page', async () => {
    const draftEntry: Entry = {
      ...basicEntry,
      versions: [{ ...basicEntry.versions[0]!, status: 'draft', publishedAt: null }],
    };
    const fetchMock = mockDocumentTypesBff({ items: [draftEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const publishBtn = await screen.findByRole('button', { name: 'Publish' }, { timeout: 32000 });
    await waitFor(() => expect(publishBtn).toBeEnabled());
    await user.click(publishBtn);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/document-types/dt-1/versions/dt-1-v1/publish'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      );
    });
  });
});
