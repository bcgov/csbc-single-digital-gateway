import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { Route } from '@/routes/admin.document-types.$id';

vi.mock('@/lib/bff', () => {
  const BFF_ORIGIN = 'http://bff-test';
  return {
    BFF_ORIGIN,
    loginUrl: `${BFF_ORIGIN}/auth/login`,
    loginUrlFor: (path: string) => `${BFF_ORIGIN}/auth/login?returnTo=${encodeURIComponent(path)}`,
    getMe: async () => {
      const res = await fetch(`${BFF_ORIGIN}/auth/me`, { credentials: 'include' });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
      return res.json();
    },
    logout: async () => {
      await fetch(`${BFF_ORIGIN}/auth/logout`, { method: 'POST', credentials: 'include' });
    },
    displayName: (user: any) =>
      user.claims.name ?? user.claims.preferred_username ?? user.claims.email ?? user.id,
  };
});

// Mock Monaco Editor because it is not supported in jsdom
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options }: any) => (
    <textarea
      data-testid="mock-monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={options?.readOnly}
    />
  ),
}));

// The live preview renders through JSONForms (heavy; covered in @repo/react) — stub it here.
vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: ({ readonly }: { readonly?: boolean }) => (
    <div data-testid="jsonforms">{readonly ? 'readonly' : 'interactive'}</div>
  ),
}));
vi.mock('@repo/react/jsonforms-renderers-display', () => ({ displayRenderers: [] }));

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };

const mockDocumentType = {
  type: {
    id: 'dt-1',
    name: 'Passport Application Form',
    kind: 'basic-form',
  },
  versions: [
    {
      id: 'ver-1',
      version: 1,
      status: 'published',
      definition: { schema: { type: 'object' } },
    },
    {
      id: 'ver-2',
      version: 2,
      status: 'draft',
      definition: { schema: { type: 'string' } },
    },
  ],
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withDocumentType(base: ReturnType<typeof mockAuth>, docTypeData: any = mockDocumentType) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/v1/admin/document-types/dt-1')) {
      if (url.endsWith('/versions')) {
        if (method === 'POST') {
          return json(
            {
              id: 'ver-3',
              version: 3,
              status: 'draft',
              definition: { schema: { type: 'string' } },
            },
            201,
          );
        }
      }
      if (url.includes('/versions/ver-2')) {
        if (method === 'PATCH') {
          return json({
            id: 'ver-2',
            version: 2,
            status: 'draft',
            definition: JSON.parse(init?.body as string).definition,
          });
        }
      }
      return json(docTypeData);
    }

    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Admin Document Type ID Route Integration Test Suite', () => {
  it('verifies route has a valid component definition', () => {
    expect(Route.options.component).toBeDefined();
  });

  it('renders the document type name, kind, and version dropdown through the router', async () => {
    withDocumentType(mockAuth(adminUser));
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: 'Passport Application Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('basic-form')).toBeInTheDocument();

    // Latest (v2) is selected; the dropdown lists both versions with their statuses.
    await user.click(screen.getByRole('button', { name: /version v2/i }));
    expect(await screen.findByRole('menuitem', { name: /v1/i })).toHaveTextContent('published');
    expect(screen.getByRole('menuitem', { name: /v2/i })).toHaveTextContent('draft');
  });

  it('loads and switches the editor definition when selecting different versions', async () => {
    withDocumentType(mockAuth(adminUser));
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // Default selected version should be the latest (v2)
    const editor = await screen.findByTestId('mock-monaco-editor', undefined, { timeout: 32000 });
    expect(editor).toHaveValue(JSON.stringify(mockDocumentType.versions[1].definition, null, 2));
    expect(editor).not.toHaveAttribute('readonly');

    // Select v1 from the dropdown → its read-only definition loads
    await user.click(screen.getByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    await waitFor(() =>
      expect(editor).toHaveValue(JSON.stringify(mockDocumentType.versions[0].definition, null, 2)),
    );
    expect(editor).toHaveAttribute('readonly');
  });

  it('triggers a PATCH request to save changes made to a draft version definition', async () => {
    const fetchMock = withDocumentType(mockAuth(adminUser));
    renderApp('/admin/document-types/dt-1');

    const user = userEvent.setup();
    const editor = await screen.findByTestId('mock-monaco-editor');
    const newDefinition = { schema: { type: 'boolean' } };

    // Clear and type new JSON definition
    fireEvent.change(editor, { target: { value: JSON.stringify(newDefinition) } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/document-types/dt-1/versions/ver-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ definition: newDefinition }),
        }),
      );
    });
  });

  it('lists an archived version in the version dropdown', async () => {
    const mockDocumentTypeWithArchived = {
      ...mockDocumentType,
      versions: [
        ...mockDocumentType.versions,
        {
          id: 'ver-3',
          version: 3,
          status: 'archived',
          definition: { schema: { type: 'number' } },
        },
      ],
    };

    withDocumentType(mockAuth(adminUser), mockDocumentTypeWithArchived);
    renderApp('/admin/document-types/dt-1');
    const user = userEvent.setup();

    // Latest is now v3 (archived).
    await user.click(
      await screen.findByRole('button', { name: /version v3/i }, { timeout: 32000 }),
    );
    expect(await screen.findByRole('menuitem', { name: /v3/i })).toHaveTextContent('archived');
  });

  it('renders validation error when saving invalid json draft definition', async () => {
    withDocumentType(mockAuth(adminUser));
    renderApp('/admin/document-types/dt-1');

    const user = userEvent.setup();
    const editor = await screen.findByTestId('mock-monaco-editor');

    fireEvent.change(editor, { target: { value: '{ invalid JSON' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Definition is not valid JSON.');
  });
});
