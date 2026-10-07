import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';
import { adminUser, ISO } from '../../../../support/fixtures';
import { mockDocumentTypesBff, type Entry } from '../../../../support/mock-document-types-bff';
import { mockAuthUser } from '../../../../support/mock-auth-user';

// Monaco can't run in jsdom — proxy it with a plain textarea.
vi.mock('@monaco-editor/react', () => ({
  default: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange?: (v: string) => void;
    options?: { readOnly?: boolean };
  }) => (
    <textarea
      aria-label="definition"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={options?.readOnly}
    />
  ),
}));

// The live preview renders through JSONForms (heavy; covered in @repo/react). Stub it + the display
// renderer set so this suite stays fast — reflect the `readonly` prop so we can assert the toggle.
vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: ({ readonly }: { readonly?: boolean }) => (
    <div data-testid="jsonforms">{readonly ? 'readonly' : 'interactive'}</div>
  ),
}));
vi.mock('@repo/react/jsonforms-renderers-display', () => ({ displayRenderers: [] }));

afterEach(() => {
  vi.restoreAllMocks();
});

/** A JSONForms-renderable definition (has a `schema`) so the preview pane renders the form stub. */
const defWithSchema = (title: string) => ({
  schema: { type: 'object', properties: { title: { type: 'string', title } } },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/title' }],
  },
});

const publishedEntry: Entry = {
  type: { id: 'dt-1', workspaceId: null, name: 'Basic Form', kind: 'basic-form', createdAt: ISO },
  versions: [
    {
      id: 'dt-1-v1',
      typeId: 'dt-1',
      version: 1,
      status: 'published',
      definition: defWithSchema('v1'),
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
  ],
};

// Published v1 + a draft v2 (v2 is the latest).
const draftLatestEntry: Entry = {
  type: { id: 'dt-1', workspaceId: null, name: 'Basic Form', kind: 'basic-form', createdAt: ISO },
  versions: [
    {
      id: 'dt-1-v1',
      typeId: 'dt-1',
      version: 1,
      status: 'published',
      definition: defWithSchema('v1'),
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
    {
      id: 'dt-1-v2',
      typeId: 'dt-1',
      version: 2,
      status: 'draft',
      definition: defWithSchema('v2'),
      createdAt: ISO,
      publishedAt: null,
      archivedAt: null,
    },
  ],
};

describe('AdminDocumentTypeDetail', () => {
  it('renders the heading, version dropdown, and seeded definition editor', async () => {
    mockDocumentTypesBff({ items: [publishedEntry] });
    renderApp('/admin/document-types/dt-1');

    expect(
      await screen.findByRole('heading', { name: 'Basic Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('basic-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v1/i })).toBeInTheDocument();

    const textarea = screen.getByLabelText('definition');
    expect(textarea).toHaveValue(JSON.stringify(defWithSchema('v1'), null, 2));
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
  });

  it('shows New version (only) on a non-draft latest version', async () => {
    mockDocumentTypesBff({ items: [publishedEntry] });
    renderApp('/admin/document-types/dt-1');

    expect(
      await screen.findByRole('button', { name: 'New version' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('shows Save draft + Publish (not New version) when the latest version is a draft', async () => {
    mockDocumentTypesBff({ items: [draftLatestEntry] });
    renderApp('/admin/document-types/dt-1');

    // v2 (draft) is selected by default.
    expect(
      await screen.findByRole('button', { name: 'Save draft' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
    expect(screen.queryByText('Read-only (not a draft)')).not.toBeInTheDocument();
  });

  it('switches the selected version via the dropdown and returns via Go to current', async () => {
    mockDocumentTypesBff({ items: [draftLatestEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    expect(textarea).toHaveValue(JSON.stringify(defWithSchema('v2'), null, 2));

    await user.click(await screen.findByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    await waitFor(() => expect(textarea).toHaveValue(JSON.stringify(defWithSchema('v1'), null, 2)));
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
    const goToCurrentButton = screen.getByRole('button', { name: 'Go to current' });
    expect(goToCurrentButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();

    await user.click(goToCurrentButton);
    await waitFor(() => expect(textarea).toHaveValue(JSON.stringify(defWithSchema('v2'), null, 2)));
    expect(screen.queryByRole('button', { name: 'Go to current' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v2/i })).toBeInTheDocument();
  });

  it('saves the draft definition via PATCH', async () => {
    const fetchMock = mockDocumentTypesBff({ items: [draftLatestEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    const saveButton = screen.getByRole('button', { name: 'Save draft' });

    const updated = JSON.stringify({ ...defWithSchema('v2'), count: 123 }, null, 2);
    fireEvent.change(textarea, { target: { value: updated } });

    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-1/versions/dt-1-v2') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      );
      expect(patch).toBeTruthy();
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        definition: { ...defWithSchema('v2'), count: 123 },
      });
    });
  });

  it('shows an error when the draft definition is not valid JSON on save', async () => {
    mockDocumentTypesBff({ items: [draftLatestEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    fireEvent.change(textarea, { target: { value: '{"broken": json' } });
    const saveButton = screen.getByRole('button', { name: 'Save draft' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Definition is not valid JSON.');
  });

  it('publishes the selected draft version', async () => {
    const fetchMock = mockDocumentTypesBff({ items: [draftLatestEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // Publish is enabled only when not dirty (nothing edited yet).
    const publishButton = await screen.findByRole(
      'button',
      { name: 'Publish' },
      { timeout: 32000 },
    );
    await waitFor(() => expect(publishButton).toBeEnabled());
    await user.click(publishButton);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/v1/admin/document-types/dt-1/versions/dt-1-v2/publish') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('creates a new version from the latest published version', async () => {
    const fetchMock = mockDocumentTypesBff({ items: [publishedEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'New version' }, { timeout: 32000 }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/v1/admin/document-types/dt-1/versions') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('renders the live preview and toggles between interactive and read-only, and ignores deselect', async () => {
    mockDocumentTypesBff({ items: [draftLatestEntry] });
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // Preview (JSONForms stub) appears once the definition text debounces in.
    const preview = await screen.findByTestId('jsonforms', undefined, { timeout: 32000 });
    expect(preview).toHaveTextContent('interactive');

    const interactiveBtn = screen.getByRole('button', { name: 'Interactive' });
    const readonlyBtn = screen.getByRole('button', { name: 'Read-only' });

    // Clicking already active toggle item deselects it, fallback retains interactive
    await user.click(interactiveBtn);
    expect(screen.getByTestId('jsonforms')).toHaveTextContent('interactive');

    await user.click(readonlyBtn);
    await waitFor(() => expect(screen.getByTestId('jsonforms')).toHaveTextContent('readonly'));
  });

  it('handles a document type with no versions and allows creating a version', async () => {
    const emptyEntry: Entry = {
      type: {
        id: 'dt-empty',
        workspaceId: null,
        name: 'Empty Type',
        kind: 'empty-kind',
        createdAt: ISO,
      },
      versions: [],
    };
    const fetchMock = mockDocumentTypesBff({ items: [emptyEntry] });
    renderApp('/admin/document-types/dt-empty');
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Empty Type' })).toBeInTheDocument();
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();

    const newVersionBtn = screen.getByRole('button', { name: 'New version' });
    await user.click(newVersionBtn);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/v1/admin/document-types/dt-empty/versions') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('renders nothing when the document type is not found', async () => {
    mockAuthUser(adminUser);

    const { container } = renderApp('/admin/document-types/dt-unknown');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.querySelector('main')?.firstChild).toBeNull();
  });
});
