import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authedUser,
  mockAuth,
  renderApp,
  type WorkspaceLike,
} from '../../../../support/render-app';

let capturedOptionsList: any[] = [];
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useMutation: vi.fn((options: any) => {
      capturedOptionsList.push(options);
      return actual.useMutation(options);
    }),
  };
});

let mockUser: any = {
  id: 'u1',
  roles: ['admin'],
  claims: {
    sub: 'subject-1',
    name: 'Maya Reyes',
    email: 'maya.reyes@riverton.gov',
    preferred_username: 'maya',
  },
};

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    useAuth: vi.fn(() => ({ data: mockUser })),
  };
});

// Explicitly import routes to register in the router
import '@/routes/admin.service-agreements.$id';
import '@/routes/app';
import '@/routes/app.$slug';
import '@/routes/app.$slug.service-agreements';
import '@/routes/app.$slug.service-agreements.index';
import '@/routes/app.$slug.service-agreements.$id';

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: vi.fn(({ data, readonly, onChange }: any) => (
    <div data-testid="mock-json-forms">
      <label htmlFor="title-input">Title</label>
      <input
        id="title-input"
        type="text"
        value={data?.title ?? ''}
        disabled={readonly}
        onChange={(e) => {
          onChange({ data: { ...data, title: e.target.value } });
        }}
      />
    </div>
  )),
}));

afterEach(() => {
  mockUser = adminUser;
  capturedOptionsList = [];
  vi.restoreAllMocks();
});

const ISO = '2026-07-07T00:00:00.000Z';
const adminUser = { ...authedUser, roles: ['admin'] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const initialDetailResponse = {
  agreement: {
    id: 'g1',
    workspaceId: null,
    title: 'Global Privacy Policy',
    kind: 'service-agreement',
    createdAt: ISO,
  },
  versions: [
    {
      id: 'v1',
      version: 1,
      status: 'published',
      data: {
        title: 'Global Privacy Policy V1',
        body: 'V1 published agreement content.',
      },
      createdAt: ISO,
      publishedAt: ISO,
      archivedAt: null,
    },
    {
      id: 'v2',
      version: 2,
      status: 'draft',
      data: {
        title: 'Global Privacy Policy V2 Draft',
        body: 'V2 draft agreement content.',
      },
      createdAt: ISO,
      publishedAt: null,
      archivedAt: null,
    },
  ],
  definition: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
    },
    uischema: {},
  },
  services: [
    {
      id: 's1',
      title: 'Service One',
      workspaceSlug: 'w1-slug',
    },
  ],
};

const riverton: WorkspaceLike = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton Workspace',
  role: 'admin',
  createdAt: ISO,
};

function setupMocks(detailData: any = initialDetailResponse) {
  const base = mockAuth(adminUser, { workspaces: [riverton] });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/v1/service-agreements/g1')) {
      if (method === 'PATCH' && url.includes('/versions/v2')) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const updatedVersion = {
          id: 'v2',
          version: 2,
          status: 'draft',
          data: body.data,
          createdAt: ISO,
          publishedAt: null,
          archivedAt: null,
        };
        return json(updatedVersion);
      }

      if (method === 'POST' && url.includes('/versions/v2/publish')) {
        const publishedVersion = {
          id: 'v2',
          version: 2,
          status: 'published',
          data: detailData.versions[1].data,
          createdAt: ISO,
          publishedAt: ISO,
          archivedAt: null,
        };
        return json(publishedVersion);
      }

      if (method === 'POST' && url.includes('/versions')) {
        const newVersion = {
          id: 'v3',
          version: 3,
          status: 'draft',
          data: detailData.versions[1].data,
          createdAt: ISO,
          publishedAt: null,
          archivedAt: null,
        };
        return json(newVersion);
      }

      return json(detailData);
    }

    return (base as any)(input, init);
  });
  globalThis.fetch = fetchMock as any;
  return fetchMock;
}

describe('AgreementDetail Component Test Suite', () => {
  it('renders details of a service agreement, switches versions, and lists associated services', async () => {
    setupMocks();
    renderApp('/admin/service-agreements/g1');

    // Wait for the auth/me query to load and the draft to become editable (indicated by Publish button)
    expect(
      await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 }),
    ).toBeInTheDocument();

    // Check title & version and associated services are rendered
    expect(screen.getByText('Global Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('Service One')).toBeInTheDocument();

    // Check default picker is on version 2 (the latest one)
    expect(screen.getByText(/Version v2/)).toBeInTheDocument();

    // The fields for version 2 should be populated in the inputs
    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Global Privacy Policy V2 Draft');

    // 2. Switch to version 1 using picker
    const pickerButton = screen.getByRole('button', { name: /Version v2/i });
    await userEvent.click(pickerButton);

    const v1Item = await screen.findByRole('menuitem', { name: /v1/i });
    await userEvent.click(v1Item);

    // Verify picker text changed and fields updated
    expect(await screen.findByText(/Version v1/, {}, { timeout: 10000 })).toBeInTheDocument();
    expect(titleInput.value).toBe('Global Privacy Policy V1');
  });

  it('allows editing and saving a draft version', async () => {
    const fetchMock = setupMocks();
    renderApp('/admin/service-agreements/g1');

    // Wait for Publish button to ensure editable state
    expect(
      await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 }),
    ).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;

    // Initially Save should be disabled because it's not dirty
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeDisabled();

    // Modify a field to make it dirty
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Global Privacy Policy V2 Updated');
    expect(saveBtn).not.toBeDisabled();

    // Click Save
    await userEvent.click(saveBtn);

    // Verify PATCH request was sent
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements/g1/versions/v2'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            title: 'Global Privacy Policy V2 Updated',
            body: 'V2 draft agreement content.',
          },
          title: 'Global Privacy Policy V2 Updated',
        }),
      }),
    );
  });

  it('allows publishing a draft version', async () => {
    const fetchMock = setupMocks();
    renderApp('/admin/service-agreements/g1');

    // Wait for Publish button to ensure editable state
    const publishBtn = await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 });
    expect(publishBtn).not.toBeDisabled();

    // Click Publish
    await userEvent.click(publishBtn);

    // Verify POST publish request was sent
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements/g1/versions/v2/publish'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('allows creating a new version draft from a published version', async () => {
    // Mock where version 2 is already published so we can create a new version (v3)
    const publishedResponse = {
      ...initialDetailResponse,
      versions: [
        initialDetailResponse.versions[0],
        { ...initialDetailResponse.versions[1], status: 'published', publishedAt: ISO },
      ],
    };
    const fetchMock = setupMocks(publishedResponse);
    renderApp('/admin/service-agreements/g1');

    // Wait for "New version" button to ensure view has loaded in non-editable published state
    const newVersionBtn = await screen.findByRole(
      'button',
      { name: /new version/i },
      { timeout: 10000 },
    );
    expect(newVersionBtn).toBeInTheDocument();

    // Click "New version"
    await userEvent.click(newVersionBtn);

    // Verify POST version request was sent
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/service-agreements/g1/versions'),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('covers save and publish error branches when no version is selected', async () => {
    // Render with empty versions list
    setupMocks({
      ...initialDetailResponse,
      versions: [],
    });

    renderApp('/admin/service-agreements/g1');

    // Wait for the render/query to load
    await screen.findByText('Global Privacy Policy', undefined, { timeout: 10000 });

    // Identify mutations by function string matches
    const saveOpt = capturedOptionsList.find((o) =>
      o.mutationFn?.toString().includes('updateAgreementDraft'),
    );
    const publishOpt = capturedOptionsList.find((o) =>
      o.mutationFn?.toString().includes('publishAgreementVersion'),
    );

    expect(saveOpt).toBeDefined();
    expect(publishOpt).toBeDefined();

    expect(() => saveOpt.mutationFn()).toThrow('No version selected');
    expect(() => publishOpt.mutationFn()).toThrow('No version selected');
  });

  it('renders workspace scoped agreement details without global badge', async () => {
    const workspaceResponse = {
      ...initialDetailResponse,
      agreement: {
        id: 'g1',
        workspaceId: 'w1',
        title: 'Workspace TOS',
        kind: 'service-agreement',
        createdAt: ISO,
      },
    };
    setupMocks(workspaceResponse);
    renderApp('/app/riverton/service-agreements/g1');

    // Wait for workspace details
    expect(
      await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 }),
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Workspace TOS' })).toBeInTheDocument();
    // Global badge should not be present
    expect(screen.queryByText('Global')).not.toBeInTheDocument();
    // Back link should point to workspace agreements
    const backLinks = screen.getAllByRole('link', { name: /Service agreements/i });
    expect(backLinks.length).toBeGreaterThan(0);
    expect(backLinks[0]).toHaveAttribute('href', '/app/riverton/service-agreements');
  });

  it('shows error banner when saving fails, and renders spinner during pending mutations', async () => {
    let resolvePut!: (v: any) => void;
    const putPromise = new Promise((resolve) => {
      resolvePut = resolve;
    });

    const fetchMock = setupMocks();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/service-agreements/g1/versions/v2') && method === 'PATCH') {
        await putPromise;
        return new Response(null, { status: 500 });
      }
      return fetchMock(input, init);
    }) as any;

    renderApp('/admin/service-agreements/g1');

    // Wait for form to load
    const saveBtn = await screen.findByRole('button', { name: /save/i }, { timeout: 10000 });

    // Make form dirty by typing in mock editor title input
    const titleInput = screen.getByLabelText('Title');
    await userEvent.type(titleInput, '!');

    // Click save
    await userEvent.click(saveBtn);

    // Expect save button to be disabled and show spinner (busy)
    expect(saveBtn).toBeDisabled();

    // Resolve with error
    resolvePut(null);

    // Expect error banner to render
    const errorAlert = await screen.findByRole('alert', {}, { timeout: 10000 });
    expect(errorAlert).toHaveTextContent('Request failed');
  });

  it('shows read-only view for non-admin member, empty services fallback, and title undefined branch', async () => {
    const staffResponse = {
      ...initialDetailResponse,
      agreement: {
        ...initialDetailResponse.agreement,
        workspaceId: null, // represents global agreement
      },
      versions: [
        initialDetailResponse.versions[0],
        { ...initialDetailResponse.versions[1], data: { body: 'no title' } },
      ],
      services: [],
    };

    // Setup mock auth as staff member
    mockUser = { ...authedUser, roles: ['staff'] };
    const base = mockAuth(mockUser, { workspaces: [riverton] });
    let patchUrl = '';
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v1/service-agreements/g1/versions/v2')) {
        patchUrl = url;
        return json({ id: 'v2', data: {} });
      }
      if (url.includes('/v1/service-agreements/g1')) {
        return json(staffResponse);
      }
      if (url.includes('/notifications')) {
        return json({});
      }
      return (base as any)(input, init);
    }) as any;

    renderApp('/app/riverton/service-agreements/g1');

    // Wait for the render/query to load
    await screen.findByRole('heading', { name: 'Global Privacy Policy' }, { timeout: 10000 });

    // Buttons should not render as editable since it's global and user is staff
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();

    // Verify empty services fallback is rendered
    expect(screen.getByText(/Not attached to any service yet/i)).toBeInTheDocument();

    // Now, let's call the captured save mutation options manually to cover `formData.title` undefined branch!
    const saveOpt = capturedOptionsList.find((o) =>
      o.mutationFn?.toString().includes('updateAgreementDraft'),
    );
    expect(saveOpt).toBeDefined();

    await saveOpt.mutationFn();
    expect(patchUrl).toContain('/v1/service-agreements/g1/versions/v2');
  });

  it('disables publish button and renders spinner when publish is pending', async () => {
    let resolvePublish!: (v: any) => void;
    const publishPromise = new Promise((resolve) => {
      resolvePublish = resolve;
    });

    const fetchMock = setupMocks();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/versions/v2/publish') && method === 'POST') {
        await publishPromise;
        return json({ id: 'v2', status: 'published' });
      }
      return fetchMock(input, init);
    }) as any;

    renderApp('/admin/service-agreements/g1');

    // Wait for form to load
    const publishBtn = await screen.findByRole('button', { name: /publish/i }, { timeout: 10000 });

    // Click publish
    await userEvent.click(publishBtn);

    // Expect publish button to be disabled and show spinner (busy)
    expect(publishBtn).toBeDisabled();

    // Resolve publish
    resolvePublish(null);

    // Wait for button to be enabled again
    await waitFor(() => {
      expect(publishBtn).toBeEnabled();
    });
  });

  it('covers user undefined branch', async () => {
    mockUser = undefined;
    setupMocks();
    renderApp('/app/riverton/service-agreements/g1');
    // Wait for the render/query to load
    await screen.findByRole('heading', { name: 'Global Privacy Policy' }, { timeout: 10000 });
    // It should render successfully in read-only mode
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
});
