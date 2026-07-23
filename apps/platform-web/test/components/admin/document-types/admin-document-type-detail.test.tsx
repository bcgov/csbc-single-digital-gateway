import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../support/render-app';

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
      if (segs.length === 1) {
        if (method === 'GET') {
          return json(entry);
        }
      }
      if (segs[1] === 'versions') {
        if (segs.length === 2) {
          if (method === 'POST') {
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
        } else if (segs.length === 3) {
          const versionId = decodeURIComponent(segs[2]!);
          const versionIdx = entry.versions.findIndex((v) => v.id === versionId);
          if (versionIdx === -1) {
            return new Response(null, { status: 404 });
          }
          const version = entry.versions[versionIdx]!;
          if (method === 'PATCH') {
            const body = init?.body
              ? (JSON.parse(String(init.body)) as { definition: Record<string, unknown> })
              : { definition: {} };
            version.definition = body.definition;
            return json(version);
          }
          if (method === 'DELETE') {
            entry.versions.splice(versionIdx, 1);
            return new Response(null, { status: 204 });
          }
        } else if (segs.length === 4) {
          const versionId = decodeURIComponent(segs[2]!);
          const version = entry.versions.find((v) => v.id === versionId);
          if (!version) {
            return new Response(null, { status: 404 });
          }
          const action = segs[3];
          if (action === 'publish' && method === 'POST') {
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
          if (action === 'archive' && method === 'POST') {
            version.status = 'archived';
            version.archivedAt = ISO;
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

const multipleEntry: Entry = {
  type: { id: 'dt-1', workspaceId: null, name: 'Basic Form', kind: 'basic-form', createdAt: ISO },
  versions: [
    {
      id: 'dt-1-v1',
      typeId: 'dt-1',
      version: 1,
      status: 'published',
      definition: { name: 'v1' },
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
    {
      id: 'dt-1-v2',
      typeId: 'dt-1',
      version: 2,
      status: 'draft',
      definition: { name: 'v2' },
      createdAt: ISO,
      publishedAt: null,
      archivedAt: null,
    },
  ],
};

describe('AdminDocumentTypeDetail', () => {
  it('renders document type details, version history, and definition', async () => {
    mockApi([basicEntry]);
    renderApp('/admin/document-types/dt-1');

    expect(
      await screen.findByRole('heading', { name: 'Basic Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('basic-form')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'v1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'published' })).toBeInTheDocument();

    const textarea = screen.getByLabelText('definition');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(JSON.stringify({ name: 'x' }, null, 2));
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
  });

  it('switches the definition displayed in editor when clicking a different version row', async () => {
    mockApi([multipleEntry]);
    renderApp('/admin/document-types/dt-1');

    // Default selected version should be the latest (v2, which is draft)
    const textarea = await screen.findByLabelText('definition');
    expect(textarea).toHaveValue(JSON.stringify({ name: 'v2' }, null, 2));
    expect(screen.getByText('Definition (v2)')).toBeInTheDocument();
    expect(screen.queryByText('Read-only (not a draft)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    // Click the row for v1
    const v1Cell = screen.getByRole('cell', { name: 'v1' });
    fireEvent.click(v1Cell);

    // Should switch to v1 definition (read-only)
    await waitFor(() => {
      expect(textarea).toHaveValue(JSON.stringify({ name: 'v1' }, null, 2));
    });
    expect(screen.getByText('Definition (v1)')).toBeInTheDocument();
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('saves updates to a draft version definition', async () => {
    const { fetchMock } = mockApi([multipleEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    const saveButton = screen.getByRole('button', { name: 'Save' });

    // Modify definition value
    const updatedJson = JSON.stringify({ name: 'v2-updated', count: 123 }, null, 2);
    fireEvent.change(textarea, { target: { value: updatedJson } });

    // Save changes
    await user.click(saveButton);

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-1/versions/dt-1-v2') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      );
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
        definition: { name: 'v2-updated', count: 123 },
      });
    });
  });

  it('shows an error message if the draft definition is not valid JSON upon save', async () => {
    mockApi([multipleEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    const saveButton = screen.getByRole('button', { name: 'Save' });

    // Put invalid JSON in editor
    fireEvent.change(textarea, { target: { value: '{"broken": json' } });
    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Definition is not valid JSON.');
  });

  it('adds a new version based on current version definition', async () => {
    const { fetchMock } = mockApi([basicEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const addVersionButton = await screen.findByRole('button', { name: 'Add version' });
    await user.click(addVersionButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-1/versions') &&
          !String(input).includes('dt-1-v1') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
        definition: { name: 'x' },
      });
    });

    // The new version should appear in the table as v2
    expect(await screen.findByRole('cell', { name: 'v2' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'draft' })).toBeInTheDocument();
  });

  it('publishes, archives, and deletes versions through action buttons', async () => {
    const { fetchMock } = mockApi([multipleEntry]);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // v2 is a draft, so it should show Publish and Delete buttons
    const publishButton = await screen.findByRole('button', { name: 'Publish' });
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();

    // Let's archive v1 (which is published, so it has Archive)
    const v1Row = screen.getByRole('row', { name: /v1/ });
    const archiveButton = within(v1Row).getByRole('button', { name: 'Archive' });
    await user.click(archiveButton);

    await waitFor(() => {
      const archiveCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-1/versions/dt-1-v1/archive') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(archiveCall).toBeTruthy();
    });

    // Let's publish v2
    await user.click(publishButton);
    await waitFor(() => {
      const publishCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-1/versions/dt-1-v2/publish') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(publishCall).toBeTruthy();
    });

    // Let's create a new version and delete it
    const addVersionButton = screen.getByRole('button', { name: 'Add version' });
    await user.click(addVersionButton);
    const newDeleteButton = await screen.findByRole('button', { name: 'Delete' });
    await user.click(newDeleteButton);

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-1/versions/dt-1-v3') &&
          (init?.method ?? 'GET').toUpperCase() === 'DELETE',
      );
      expect(deleteCall).toBeTruthy();
    });
  });

  it('renders nothing when document type data is not loaded', async () => {
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

  it('handles document type with no versions', async () => {
    const emptyEntry: Entry = {
      type: {
        id: 'dt-empty',
        workspaceId: null,
        name: 'Empty Form',
        kind: 'basic-form',
        createdAt: ISO,
      },
      versions: [],
    };
    const { fetchMock } = mockApi([emptyEntry]);
    renderApp('/admin/document-types/dt-empty');

    expect(
      await screen.findByRole('heading', { name: 'Empty Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();

    expect(screen.getByText('Definition')).toBeInTheDocument();
    expect(screen.queryByText(/v\d+/)).not.toBeInTheDocument();

    const user = userEvent.setup();
    const addVersionButton = screen.getByRole('button', { name: 'Add version' });
    await user.click(addVersionButton);

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/document-types/dt-empty/versions') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      );
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
        definition: {},
      });
    });
  });

  it('renders archived status correctly', async () => {
    const archivedEntry: Entry = {
      type: {
        id: 'dt-1',
        workspaceId: null,
        name: 'Basic Form',
        kind: 'basic-form',
        createdAt: ISO,
      },
      versions: [
        {
          id: 'dt-1-v1',
          typeId: 'dt-1',
          version: 1,
          status: 'archived',
          definition: { name: 'x' },
          createdAt: ISO,
          publishedAt: ISO,
          archivedAt: ISO,
        },
      ],
    };
    mockApi([archivedEntry]);
    renderApp('/admin/document-types/dt-1');

    expect(await screen.findByRole('cell', { name: 'archived' })).toBeInTheDocument();
  });

  it('disables the Add Version button while adding a version', async () => {
    let resolveAdd: ((r: Response) => void) | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(adminUser);
      if (url.includes('/v1/admin/document-types/dt-1/versions') && init?.method === 'POST') {
        return new Promise<Response>((resolve) => {
          resolveAdd = resolve;
        });
      }
      return json(basicEntry);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const addVersionButton = await screen.findByRole('button', { name: 'Add version' });
    await user.click(addVersionButton);

    // It should be disabled now
    expect(addVersionButton).toBeDisabled();

    // Resolve the promise
    resolveAdd!(
      json({
        id: 'dt-1-v2',
        typeId: 'dt-1',
        version: 2,
        status: 'draft',
        definition: {},
        createdAt: ISO,
        publishedAt: null,
        archivedAt: null,
      }),
    );

    await waitFor(() => {
      expect(addVersionButton).not.toBeDisabled();
    });
  });

  it('disables the Save button while saving draft text', async () => {
    let resolveSave: ((r: Response) => void) | null = null;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/me')) return json(adminUser);
      if (
        url.includes('/v1/admin/document-types/dt-1/versions/dt-1-v2') &&
        init?.method === 'PATCH'
      ) {
        return new Promise<Response>((resolve) => {
          resolveSave = resolve;
        });
      }
      return json(multipleEntry);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('definition');
    const saveButton = screen.getByRole('button', { name: 'Save' });

    // Modify definition
    fireEvent.change(textarea, { target: { value: '{"key": "new"}' } });
    await user.click(saveButton);

    // It should be disabled now
    expect(saveButton).toBeDisabled();

    // Resolve the promise
    resolveSave!(
      json({
        id: 'dt-1-v2',
        typeId: 'dt-1',
        version: 2,
        status: 'draft',
        definition: { key: 'new' },
        createdAt: ISO,
        publishedAt: null,
        archivedAt: null,
      }),
    );

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});
