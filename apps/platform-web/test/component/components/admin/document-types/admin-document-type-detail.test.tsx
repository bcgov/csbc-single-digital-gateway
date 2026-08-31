import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';

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

/** A JSONForms-renderable definition (has a `schema`) so the preview pane renders the form stub. */
const defWithSchema = (title: string) => ({
  schema: { type: 'object', properties: { title: { type: 'string', title } } },
  uischema: {
    type: 'VerticalLayout',
    elements: [{ type: 'Control', scope: '#/properties/title' }],
  },
});

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
    if (url.includes('/v1/admin/document-types')) {
      const rest = url.split('/v1/admin/document-types')[1]?.split('?')[0] ?? '';
      const segs = rest.split('/').filter(Boolean);
      if (segs.length === 0) {
        return json({ items: store });
      }
      const entry = store.find((e) => e.type.id === decodeURIComponent(segs[0]!));
      if (!entry) {
        return new Response(null, { status: 404 });
      }
      if (segs.length === 1 && method === 'GET') {
        return json(entry);
      }
      if (segs[1] === 'versions') {
        if (segs.length === 2 && method === 'POST') {
          const body = init?.body
            ? (JSON.parse(String(init.body)) as { definition: Record<string, unknown> })
            : { definition: {} };
          const nextVerNum = entry.versions.length + 1;
          const newVersion: Version = {
            id: `${entry.type.id}-v${nextVerNum}`,
            typeId: entry.type.id,
            version: nextVerNum,
            status: 'draft',
            definition: body.definition,
            createdAt: ISO,
            publishedAt: null,
            archivedAt: null,
          };
          entry.versions.push(newVersion);
          return json(newVersion);
        }
        if (segs.length === 3) {
          const versionId = decodeURIComponent(segs[2]!);
          const version = entry.versions.find((v) => v.id === versionId);
          if (!version) {
            return new Response(null, { status: 404 });
          }
          if (method === 'PATCH') {
            const body = init?.body
              ? (JSON.parse(String(init.body)) as { definition: Record<string, unknown> })
              : { definition: {} };
            version.definition = body.definition;
            return json(version);
          }
        }
        if (segs.length === 4) {
          const versionId = decodeURIComponent(segs[2]!);
          const version = entry.versions.find((v) => v.id === versionId);
          if (!version) {
            return new Response(null, { status: 404 });
          }
          if (segs[3] === 'publish' && method === 'POST') {
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
        }
      }
      return new Response(null, { status: 404 });
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { store, fetchMock };
}

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
    mockApi([publishedEntry]);
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
    mockApi([publishedEntry]);
    renderApp('/admin/document-types/dt-1');

    expect(
      await screen.findByRole('button', { name: 'New version' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('shows Save draft + Publish (not New version) when the latest version is a draft', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/document-types/dt-1');

    // v2 (draft) is selected by default.
    expect(
      await screen.findByRole('button', { name: 'Save draft' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
    expect(screen.queryByText('Read-only (not a draft)')).not.toBeInTheDocument();
  });

  it('switches the selected version via the dropdown (older non-draft is read-only)', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    expect(textarea).toHaveValue(JSON.stringify(defWithSchema('v2'), null, 2));

    await user.click(await screen.findByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    await waitFor(() => expect(textarea).toHaveValue(JSON.stringify(defWithSchema('v1'), null, 2)));
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to current' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('saves the draft definition via PATCH', async () => {
    const { fetchMock } = mockApi([draftLatestEntry]);
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
    mockApi([draftLatestEntry]);
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
    const { fetchMock } = mockApi([draftLatestEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // Publish is enabled only when not dirty (nothing edited yet).
    const publishButton = await screen.findByRole(
      'button',
      { name: 'Publish' },
      { timeout: 32000 },
    );
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
    const { fetchMock } = mockApi([publishedEntry]);
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

  it('renders the live preview and toggles between interactive and read-only', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // Preview (JSONForms stub) appears once the definition text debounces in.
    const preview = await screen.findByTestId('jsonforms', undefined, { timeout: 32000 });
    expect(preview).toHaveTextContent('interactive');

    await user.click(screen.getByRole('button', { name: 'Read-only' }));
    await waitFor(() => expect(screen.getByTestId('jsonforms')).toHaveTextContent('readonly'));
  });

  it('renders nothing when the document type is not found', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) {
        return json(adminUser);
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = renderApp('/admin/document-types/dt-unknown');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.querySelector('main')?.firstChild).toBeNull();
  });
});
