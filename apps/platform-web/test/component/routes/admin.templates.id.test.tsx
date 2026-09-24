import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';
import { Route } from '@/routes/admin.templates.$id';

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

// Doc 218: the page opens a version's content in the Form Studio (draft) or a disabled FormRunner (otherwise).
// jsdom can run neither — see `test/support/mock-forms.tsx` for what these stubs do and why.
vi.mock('@repo/forms/studio', async () =>
  (await import('../../support/mock-forms')).formStudioMock(),
);
vi.mock('@repo/forms/runner', async () =>
  (await import('../../support/mock-forms')).formRunnerMock(),
);

afterEach(() => {
  vi.restoreAllMocks();
});

const adminUser = { ...authedUser, roles: ['admin'] };

/**
 * Feature 217: a template is a document — its NAME is the latest version's GENERATED title, its
 * `type` replaces the text `kind`, and a version carries `content` rather than a `definition`.
 */
const mockTemplate = {
  template: {
    id: 'dt-1',
    type: 'application-method',
  },
  versions: [
    {
      id: 'ver-1',
      versionNumber: 1,
      status: 'published',
      title: 'Passport Application Form',
      content: {
        schema: { type: 'object' },
        uischema: { type: 'Form', label: 'v1', elements: [] },
      },
    },
    {
      id: 'ver-2',
      versionNumber: 2,
      status: 'draft',
      title: 'Passport Application Form',
      content: {
        schema: { type: 'string' },
        uischema: { type: 'Form', label: 'v2', elements: [] },
      },
    },
  ],
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function withTemplate(base: ReturnType<typeof mockAuth>, templateData: any = mockTemplate) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/v1/admin/templates/dt-1')) {
      if (url.endsWith('/versions')) {
        if (method === 'POST') {
          return json(
            {
              id: 'ver-3',
              versionNumber: 3,
              status: 'draft',
              title: 'Passport Application Form',
              content: { schema: { type: 'string' }, uischema: { type: 'Form', elements: [] } },
            },
            201,
          );
        }
      }
      if (url.includes('/versions/ver-2')) {
        if (method === 'PATCH') {
          return json({
            id: 'ver-2',
            versionNumber: 2,
            status: 'draft',
            title: 'Passport Application Form',
            content: JSON.parse(init?.body as string).content,
          });
        }
      }
      return json(templateData);
    }

    return (base as unknown as (i: RequestInfo | URL, ii?: RequestInit) => Promise<Response>)(
      input,
      init,
    );
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Admin Template ID Route Integration Test Suite', () => {
  it('verifies route has a valid component definition', () => {
    expect(Route.options.component).toBeDefined();
  });

  it('renders the template name, type, and version dropdown through the router', async () => {
    withTemplate(mockAuth(adminUser));
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    expect(
      await screen.findByRole('heading', { name: 'Passport Application Form' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('application-method')).toBeInTheDocument();

    // Latest (v2) is selected; the dropdown lists both versions with their statuses.
    await user.click(screen.getByRole('button', { name: /version v2/i }));
    expect(await screen.findByRole('menuitem', { name: /v1/i })).toHaveTextContent('published');
    expect(screen.getByRole('menuitem', { name: /v2/i })).toHaveTextContent('draft');
  });

  it('opens a draft in the studio and an older published version read-only', async () => {
    withTemplate(mockAuth(adminUser));
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    // Default selected version is the latest (v2, a draft) — authored, so the studio.
    const studio = await screen.findByTestId('form-studio', undefined, { timeout: 32000 });
    expect(studio).toHaveValue(JSON.stringify(mockTemplate.versions[1].content));

    // Select v1 from the dropdown → published, so a DISABLED runner instead (doc 218 rules 5-9).
    await user.click(screen.getByRole('button', { name: /version v2/i }));
    await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

    const runner = await screen.findByTestId('form-runner');
    expect(runner).toHaveAttribute('data-disabled', 'true');
    expect(runner).toHaveTextContent(JSON.stringify(mockTemplate.versions[0].content.uischema));
    expect(screen.queryByTestId('form-studio')).toBeNull();
  });

  it('triggers a PATCH request to save the content of a draft version', async () => {
    const fetchMock = withTemplate(mockAuth(adminUser));
    renderApp('/admin/templates/dt-1');

    const user = userEvent.setup();
    const studio = await screen.findByTestId('form-studio', undefined, { timeout: 32000 });
    const newContent = {
      schema: { type: 'boolean' },
      uischema: { type: 'Form', label: 'Renamed', elements: [] },
    };

    fireEvent.change(studio, { target: { value: JSON.stringify(newContent) } });

    const saveBtn = screen.getByRole('button', { name: /save draft/i });
    await waitFor(() => expect(saveBtn).toBeEnabled());
    await user.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/v1/admin/templates/dt-1/versions/ver-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ content: newContent }),
        }),
      );
    });
  });

  it('lists an archived version in the version dropdown', async () => {
    const mockTemplateWithArchived = {
      ...mockTemplate,
      versions: [
        ...mockTemplate.versions,
        {
          id: 'ver-3',
          versionNumber: 3,
          status: 'archived',
          title: 'Passport Application Form',
          content: { schema: { type: 'number' }, uischema: { type: 'Form', elements: [] } },
        },
      ],
    };

    withTemplate(mockAuth(adminUser), mockTemplateWithArchived);
    renderApp('/admin/templates/dt-1');
    const user = userEvent.setup();

    // Latest is now v3 (archived).
    await user.click(
      await screen.findByRole('button', { name: /version v3/i }, { timeout: 32000 }),
    );
    expect(await screen.findByRole('menuitem', { name: /v3/i })).toHaveTextContent('archived');
  });

  it('refuses to open a version whose content is not a form document (rule 13)', async () => {
    withTemplate(mockAuth(adminUser), {
      ...mockTemplate,
      versions: [{ ...mockTemplate.versions[1], content: { stages: [], edges: [] } }],
    });
    renderApp('/admin/templates/dt-1');

    // The old free-form JSON editor could store anything; this is where such a row stops.
    expect(await screen.findByRole('alert', undefined, { timeout: 32000 })).toHaveTextContent(
      /isn’t a form document/,
    );
    expect(screen.queryByTestId('form-studio')).toBeNull();
  });
});
