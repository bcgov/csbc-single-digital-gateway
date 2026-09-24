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
      aria-label="content"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={options?.readOnly}
    />
  ),
}));

// Feature 217: the live JSONForms preview beside the editor is gone with the `@repo/react`
// renderers, so there is nothing left to stub for it.

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

/** A template's content — a `@repo/forms` StudioDocument, whose root label becomes the title. */
const contentWithLabel = (label: string) => ({
  schema: { type: 'object', properties: { title: { type: 'string', title: label } } },
  uischema: { type: 'Form', label, elements: [] },
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
      if (segs.length === 1 && method === 'GET') {
        return json(entry);
      }
      if (segs[1] === 'versions') {
        if (segs.length === 2 && method === 'POST') {
          const body = init?.body
            ? (JSON.parse(String(init.body)) as { content: Record<string, unknown> })
            : { content: {} };
          const nextVerNum = entry.versions.length + 1;
          const newVersion: Version = {
            id: `${entry.template.id}-v${String(nextVerNum)}`,
            documentId: entry.template.id,
            versionNumber: nextVerNum,
            revision: 1,
            status: 'draft',
            title: 'Basic Form',
            description: null,
            content: body.content,
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
              ? (JSON.parse(String(init.body)) as { content: Record<string, unknown> })
              : { content: {} };
            version.content = body.content;
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
      content: contentWithLabel('v1'),
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
  ],
};

// Published v1 + a draft v2 (v2 is the latest).
const draftLatestEntry: Entry = {
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
      content: contentWithLabel('v1'),
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
    {
      id: 'dt-1-v2',
      documentId: 'dt-1',
      versionNumber: 2,
      revision: 1,
      status: 'draft',
      title: 'Basic Form',
      description: null,
      content: contentWithLabel('v2'),
      createdAt: ISO,
      publishedAt: null,
      archivedAt: null,
    },
  ],
};

describe('AdminTemplateDetail', () => {
  it('renders the heading, version dropdown, and seeded content editor', async () => {
    mockApi([publishedEntry]);
    renderApp('/admin/templates/dt-1');

    expect(
      await screen.findByRole('heading', { name: 'Basic Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('application-method')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v1/i })).toBeInTheDocument();

    const textarea = screen.getByLabelText('content');
    expect(textarea).toHaveValue(JSON.stringify(contentWithLabel('v1'), null, 2));
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
  });

  it('shows New version (only) on a non-draft latest version', async () => {
    mockApi([publishedEntry]);
    renderApp('/admin/templates/dt-1');

    expect(
      await screen.findByRole('button', { name: 'New version' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('shows Save draft + Publish (not New version) when the latest version is a draft', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');

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
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('content');
    expect(textarea).toHaveValue(JSON.stringify(contentWithLabel('v2'), null, 2));

    await user.click(await screen.findByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    await waitFor(() =>
      expect(textarea).toHaveValue(JSON.stringify(contentWithLabel('v1'), null, 2)),
    );
    expect(screen.getByText('Read-only (not a draft)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to current' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('saves the draft content via PATCH', async () => {
    const { fetchMock } = mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('content');
    const saveButton = screen.getByRole('button', { name: 'Save draft' });

    const updated = JSON.stringify({ ...contentWithLabel('v2'), count: 123 }, null, 2);
    fireEvent.change(textarea, { target: { value: updated } });

    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/templates/dt-1/versions/dt-1-v2') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      );
      expect(patch).toBeTruthy();
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
        content: { ...contentWithLabel('v2'), count: 123 },
      });
    });
  });

  it('shows an error when the draft content is not valid JSON on save', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    const textarea = await screen.findByLabelText('content');
    fireEvent.change(textarea, { target: { value: '{"broken": json' } });
    const saveButton = screen.getByRole('button', { name: 'Save draft' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    expect(await screen.findByRole('alert')).toHaveTextContent('Content is not valid JSON.');
  });

  it('publishes the selected draft version', async () => {
    const { fetchMock } = mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
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
            String(input).includes('/v1/admin/templates/dt-1/versions/dt-1-v2/publish') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('creates a new version from the latest published version', async () => {
    const { fetchMock } = mockApi([publishedEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'New version' }, { timeout: 32000 }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes('/v1/admin/templates/dt-1/versions') &&
            (init?.method ?? 'GET').toUpperCase() === 'POST',
        ),
      ).toBe(true);
    });
  });

  it('renders no live preview — it went with the @repo/react renderers', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');

    await screen.findByLabelText('content', undefined, { timeout: 32000 });

    expect(screen.queryByTestId('jsonforms')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Read-only' })).toBeNull();
  });

  it('renders nothing when the template is not found', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) {
        return json(adminUser);
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = renderApp('/admin/templates/dt-unknown');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(container.querySelector('main')?.firstChild).toBeNull();
  });
});
