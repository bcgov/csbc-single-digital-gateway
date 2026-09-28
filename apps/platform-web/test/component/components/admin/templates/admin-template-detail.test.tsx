import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../../../support/render-app';

// jsdom cannot run gridstack or xyflow — see `test/support/mock-forms.tsx` for what these stubs do and why.
vi.mock('@repo/forms/studio', async () =>
  (await import('../../../../support/mock-forms')).formStudioMock(),
);
vi.mock('@repo/forms/runner', async () =>
  (await import('../../../../support/mock-forms')).formRunnerMock(),
);

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
    type: 'services.service-application-method';
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
        // Doc 227: nothing deletable and no reason, so these cases see no delete control.
        return json({ ...entry, deletable: { template: false, versionIds: [] } });
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
    type: 'services.service-application-method',
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
    type: 'services.service-application-method',
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

describe('AdminTemplateDetail (doc 218)', () => {
  it('renders the heading, version dropdown, and a DISABLED runner for a published version', async () => {
    mockApi([publishedEntry]);
    renderApp('/admin/templates/dt-1');

    expect(
      await screen.findByRole('heading', { name: 'Basic Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Application method')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /version v1/i })).toBeInTheDocument();

    // Rules 5-9: a published version is READ, not authored — so the runner, disabled, over that version's uischema.
    const runner = screen.getByTestId('form-runner');
    expect(runner).toHaveAttribute('data-disabled', 'true');
    expect(runner).toHaveTextContent(JSON.stringify(contentWithLabel('v1').uischema));
    expect(screen.queryByTestId('form-studio')).toBeNull();
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

  it('opens a draft in the Form Studio, with Save draft + Publish and no New version', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');

    // v2 (draft) is selected by default.
    expect(
      await screen.findByRole('button', { name: 'Save draft' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New version' })).not.toBeInTheDocument();
    expect(screen.getByTestId('form-studio')).toBeInTheDocument();
    expect(screen.queryByTestId('form-runner')).toBeNull();
  });

  it("starts clean: the studio's baseline emit is not an edit (rule 2)", async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');

    // The studio reports its document on mount. If the page counted that as a change, Save draft would be live and
    // Publish dead before the author had touched anything.
    const save = await screen.findByRole('button', { name: 'Save draft' }, { timeout: 32000 });
    await screen.findByTestId('form-studio');
    await waitFor(() => expect(save).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('switches the selected version via the dropdown (an older non-draft opens read-only)', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    await screen.findByTestId('form-studio', undefined, { timeout: 32000 });

    await user.click(await screen.findByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    const runner = await screen.findByTestId('form-runner');
    expect(runner).toHaveTextContent(JSON.stringify(contentWithLabel('v1').uischema));
    expect(screen.queryByTestId('form-studio')).toBeNull();
    expect(screen.getByRole('button', { name: 'Go to current' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('saves the document the studio last reported, via PATCH', async () => {
    const { fetchMock } = mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    const studio = await screen.findByLabelText('document', undefined, { timeout: 32000 });
    const saveButton = screen.getByRole('button', { name: 'Save draft' });

    const edited = {
      ...contentWithLabel('v2'),
      uischema: { type: 'Form', label: 'Renamed', elements: [] },
    };
    fireEvent.change(studio, { target: { value: JSON.stringify(edited) } });

    await waitFor(() => expect(saveButton).toBeEnabled());
    await user.click(saveButton);

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).includes('/v1/admin/templates/dt-1/versions/dt-1-v2') &&
          (init?.method ?? 'GET').toUpperCase() === 'PATCH',
      );
      expect(patch).toBeTruthy();
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ content: edited });
    });
  });

  it('asks before discarding unsaved edits on a version switch (rule 19)', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    const studio = await screen.findByLabelText('document', undefined, { timeout: 32000 });
    const edited = {
      ...contentWithLabel('v2'),
      uischema: { type: 'Form', label: 'Renamed', elements: [] },
    };
    fireEvent.change(studio, { target: { value: JSON.stringify(edited) } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    // A version switch is not a navigation, so `UnsavedChangesGuard` never sees it — this is the page's own ask.
    expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.queryByTestId('form-runner')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(screen.queryByText('Discard unsaved changes?')).toBeNull());
    expect(screen.getByTestId('form-studio')).toBeInTheDocument();
  });

  it('switches version once the discard is confirmed', async () => {
    mockApi([draftLatestEntry]);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    const studio = await screen.findByLabelText('document', undefined, { timeout: 32000 });
    const edited = {
      ...contentWithLabel('v2'),
      uischema: { type: 'Form', label: 'Renamed', elements: [] },
    };
    fireEvent.change(studio, { target: { value: JSON.stringify(edited) } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled());

    await user.click(screen.getByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByTestId('form-runner')).toHaveTextContent(
      JSON.stringify(contentWithLabel('v1').uischema),
    );
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

  it('refuses to open content that is not a form document (rule 13)', async () => {
    const broken: Entry = {
      ...publishedEntry,
      versions: [{ ...publishedEntry.versions[0]!, content: { stages: [], edges: [] } }],
    };
    mockApi([broken]);
    renderApp('/admin/templates/dt-1');

    expect(await screen.findByRole('alert', undefined, { timeout: 32000 })).toHaveTextContent(
      /isn’t a form document/,
    );
    expect(screen.queryByTestId('form-studio')).toBeNull();
    expect(screen.queryByTestId('form-runner')).toBeNull();
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
