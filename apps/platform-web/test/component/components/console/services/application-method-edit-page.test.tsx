import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../../../support/render-app';

const originalFetch = globalThis.fetch;

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('CAPTURED WINDOW ERROR:', e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('CAPTURED UNHANDLED REJECTION:', e.reason);
  });
}

let mockFormQueryState: any = null;

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...original,
    useQuery: (options: any) => {
      if (
        mockFormQueryState &&
        options?.queryKey?.[0] === 'forms' &&
        options?.queryKey?.[1] === 'detail'
      ) {
        return mockFormQueryState;
      }
      return original.useQuery(options);
    },
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  mockFormQueryState = null;
});

const ISO = '2026-06-01T00:00:00.000Z';

const mockWorkspace = {
  id: 'w1',
  slug: 'riverton',
  name: 'Riverton',
  role: 'admin' as const,
  createdAt: ISO,
};

const mockServiceDetail = {
  service: {
    id: 'srv-123',
    workspaceId: 'w1',
    title: 'Municipal Parking',
    description: 'Parking permits and violations',
    createdAt: ISO,
  },
  versions: [],
  definition: { schema: {}, uischema: {} },
  hasSubmissions: false,
};

const mockBasicFormDraft = {
  form: {
    id: 'am-789',
    workspaceId: 'w1',
    title: 'Parking Application',
    kind: 'basic-form',
    createdAt: ISO,
  },
  version: {
    id: 'v-1',
    documentId: 'am-789',
    version: 1,
    status: 'draft' as const,
    schema: {
      schema: {
        type: 'object',
        title: 'Parking Application',
        properties: {
          licensePlate: { type: 'string', title: 'License Plate' },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
      },
    },
    createdAt: ISO,
  },
};

const mockBasicFormPublished = {
  form: {
    id: 'am-789',
    workspaceId: 'w1',
    title: 'Parking Application Published',
    kind: 'basic-form',
    createdAt: ISO,
  },
  version: {
    id: 'v-1',
    documentId: 'am-789',
    version: 1,
    status: 'published' as const,
    schema: {
      schema: {
        type: 'object',
        title: 'Parking Application Published',
        properties: {
          licensePlate: { type: 'string', title: 'License Plate' },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
      },
    },
    createdAt: ISO,
  },
};

const mockMultiStageFormDraft = {
  form: {
    id: 'am-789',
    workspaceId: 'w1',
    title: 'Complex Permit Application',
    kind: 'multi-stage-form',
    createdAt: ISO,
  },
  version: {
    id: 'v-1',
    documentId: 'am-789',
    version: 1,
    status: 'draft' as const,
    schema: {
      name: 'Complex Permit Application',
      description: 'Multi stage form description',
      stages: [
        {
          id: 'stg-1',
          name: 'Stage 1',
          pages: [
            {
              id: 'pg-1',
              name: 'Page 1',
              description: '',
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          ],
        },
      ],
    },
    createdAt: ISO,
  },
};

const mockMultiStageFormPublished = {
  form: {
    id: 'am-789',
    workspaceId: 'w1',
    title: 'Complex Permit Application Published',
    kind: 'multi-stage-form',
    createdAt: ISO,
  },
  version: {
    id: 'v-1',
    documentId: 'am-789',
    version: 1,
    status: 'published' as const,
    schema: {
      name: 'Complex Permit Application Published',
      description: 'Multi stage form published description',
      stages: [
        {
          id: 'stg-1',
          name: 'Stage 1',
          pages: [
            {
              id: 'pg-1',
              name: 'Page 1',
              description: '',
              schema: { type: 'object', properties: {} },
              uischema: { type: 'VerticalLayout', elements: [] },
            },
          ],
        },
      ],
    },
    createdAt: ISO,
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi({
  workspace = mockWorkspace,
  service = mockServiceDetail,
  form = mockBasicFormDraft,
  onSaveForm,
}: {
  workspace?: any;
  service?: any;
  form?: any;
  onSaveForm?: (body: any) => void;
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/auth/me')) {
      return json(authedUser);
    }
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(workspace);
    }
    if (url.includes('/v1/workspaces')) {
      return json({ items: [workspace], total: 1, limit: 100, offset: 0 });
    }
    if (url.includes('/v1/services/srv-123')) {
      return json(service);
    }
    if (url.includes('/v1/forms/am-789/versions/v-1') && method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      if (onSaveForm) {
        onSaveForm(body);
      }
      return json({
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: form.version.status,
        schema: body.definition,
        createdAt: ISO,
      });
    }
    if (url.includes('/v1/forms/am-789')) {
      return json(form);
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('Application Method Edit Page Component Test Suite', () => {
  it('renders loading spinner when loading form data', async () => {
    mockApi({
      form: mockBasicFormDraft,
    });

    mockFormQueryState = {
      isSuccess: false,
      isPending: true,
      data: undefined,
    };

    const { container } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789',
    );

    // The container should render the spinner
    await waitFor(
      () => {
        expect(container.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
      },
      { timeout: 32000 },
    );
  });

  it('renders draft basic-form layout and edits title successfully', async () => {
    let savedBody: any = null;
    mockApi({
      form: mockBasicFormDraft,
      onSaveForm: (body) => {
        savedBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789',
    );

    // Should display the sidebar with active slug context, as well as builder regions
    expect(
      await screen.findByRole('region', { name: /canvas/i }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /palette/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /inspector/i })).toBeInTheDocument();

    // Verify draft status badge
    expect(screen.getByText('draft')).toBeInTheDocument();

    // Modify the title
    const canvas = screen.getByRole('region', { name: /canvas/i });
    const titleInput = within(canvas).getByRole('textbox', { name: /title/i });
    await user.clear(titleInput);
    await user.type(titleInput, 'New Parking Application Title');

    // Click save
    const saveBtn = screen.getByRole('button', { name: 'Save form' });
    await user.click(saveBtn);

    // Verify it sent the mutation request
    await waitFor(() => {
      expect(savedBody).not.toBeNull();
    });
    expect(savedBody.title).toBe('New Parking Application Title');
    expect(savedBody.definition.schema.title).toBe('New Parking Application Title');

    // Test cancel / navigate back
    const navigateSpy = vi.spyOn(router, 'navigate');
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/$slug/services/$id/old/edit',
        params: { slug: 'riverton', id: 'srv-123' },
      }),
    );
  });

  it('renders published basic-form layout as read-only preview', async () => {
    mockApi({ form: mockBasicFormPublished });

    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    // Should display status badge
    expect(await screen.findByText('published', undefined, { timeout: 32000 })).toBeInTheDocument();

    // Should render the title and field preview instead of the active builder columns
    expect(
      screen.getByRole('heading', { level: 2, name: 'Parking Application Published' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /canvas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /palette/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save form' })).not.toBeInTheDocument();
  });

  it('renders draft multi-stage-form layout and edits definition successfully', async () => {
    let savedBody: any = null;
    mockApi({
      form: mockMultiStageFormDraft,
      onSaveForm: (body) => {
        savedBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789',
    );

    // Should render StageBuilder elements
    expect(
      await screen.findByRole('button', { name: /add stage/i }, { timeout: 32000 }),
    ).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/form name/i);
    expect(nameInput).toHaveValue('Complex Permit Application');

    // Modify name
    await user.clear(nameInput);
    await user.type(nameInput, 'New Stage Form Name');

    // Click save
    const saveBtn = screen.getByRole('button', { name: 'Save form' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(savedBody).not.toBeNull();
    });
    expect(savedBody.title).toBe('New Stage Form Name');
    expect(savedBody.definition.name).toBe('New Stage Form Name');

    // Test cancel / navigate back
    const navigateSpy = vi.spyOn(router, 'navigate');
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/$slug/services/$id/old/edit',
        params: { slug: 'riverton', id: 'srv-123' },
      }),
    );
  });

  it('renders published multi-stage-form layout as read-only stage outline', async () => {
    mockApi({ form: mockMultiStageFormPublished });

    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    // Should display the header and stage outline
    expect(
      await screen.findByRole(
        'heading',
        {
          level: 2,
          name: 'Complex Permit Application Published',
        },
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Multi stage form published description')).toBeInTheDocument();

    // Check outline content
    expect(screen.getByText('1. Stage 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();

    // StageBuilder canvas button should not be present
    expect(screen.queryByRole('button', { name: /add stage/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save form' })).not.toBeInTheDocument();
  });

  it('falls back to form title when schema title is missing in draft basic-form', async () => {
    const mockBasicFormNoTitleDraft = {
      form: {
        id: 'am-789',
        workspaceId: 'w1',
        title: 'Parking Application Fallback Title',
        kind: 'basic-form',
        createdAt: ISO,
      },
      version: {
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'draft' as const,
        schema: {
          schema: {
            type: 'object',
            properties: {
              licensePlate: { type: 'string', title: 'License Plate' },
            },
          },
          uischema: {
            type: 'VerticalLayout',
            elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
          },
        },
        createdAt: ISO,
      },
    };
    mockApi({ form: mockBasicFormNoTitleDraft });
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    const canvas = await screen.findByRole('region', { name: /canvas/i }, { timeout: 32000 });
    const titleInput = within(canvas).getByRole('textbox', { name: /title/i });
    expect(titleInput).toHaveValue('Parking Application Fallback Title');
  });

  it('falls back to form title when schema title is missing in published basic-form', async () => {
    const mockBasicFormNoTitlePublished = {
      form: {
        id: 'am-789',
        workspaceId: 'w1',
        title: 'Parking Application Fallback Title Published',
        kind: 'basic-form',
        createdAt: ISO,
      },
      version: {
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'published' as const,
        schema: {
          schema: {
            type: 'object',
            properties: {
              licensePlate: { type: 'string', title: 'License Plate' },
            },
          },
          uischema: {
            type: 'VerticalLayout',
            elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
          },
        },
        createdAt: ISO,
      },
    };
    mockApi({ form: mockBasicFormNoTitlePublished });
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    expect(
      await screen.findByRole(
        'heading',
        { level: 2, name: 'Parking Application Fallback Title Published' },
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
  });

  it('falls back to form title when schema name is empty in draft multi-stage-form', async () => {
    const mockMultiStageFormNoTitleDraft = {
      form: {
        id: 'am-789',
        workspaceId: 'w1',
        title: 'Complex Form Fallback Title',
        kind: 'multi-stage-form',
        createdAt: ISO,
      },
      version: {
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'draft' as const,
        schema: {
          name: '',
          description: '',
          stages: [
            {
              id: 'stg-1',
              name: 'Stage 1',
              pages: [
                {
                  id: 'pg-1',
                  name: 'Page 1',
                  description: '',
                  schema: { type: 'object', properties: {} },
                  uischema: { type: 'VerticalLayout', elements: [] },
                },
              ],
            },
          ],
        },
        createdAt: ISO,
      },
    };
    mockApi({ form: mockMultiStageFormNoTitleDraft });
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    const nameInput = await screen.findByLabelText(/form name/i, undefined, { timeout: 32000 });
    expect(nameInput).toHaveValue('');
    expect(screen.getAllByText('Complex Form Fallback Title')[0]).toBeInTheDocument();
  });

  it('falls back to form title when schema name is empty in published multi-stage-form', async () => {
    const mockMultiStageFormNoTitlePublished = {
      form: {
        id: 'am-789',
        workspaceId: 'w1',
        title: 'Complex Form Fallback Title Published',
        kind: 'multi-stage-form',
        createdAt: ISO,
      },
      version: {
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'published' as const,
        schema: {
          name: '',
          description: '',
          stages: [
            {
              id: 'stg-1',
              name: 'Stage 1',
              pages: [
                {
                  id: 'pg-1',
                  name: 'Page 1',
                  description: '',
                  schema: { type: 'object', properties: {} },
                  uischema: { type: 'VerticalLayout', elements: [] },
                },
              ],
            },
          ],
        },
        createdAt: ISO,
      },
    };
    mockApi({ form: mockMultiStageFormNoTitlePublished });
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    expect(
      await screen.findByRole(
        'heading',
        { level: 2, name: 'Complex Form Fallback Title Published' },
        { timeout: 32000 },
      ),
    ).toBeInTheDocument();
  });

  it('shows error message when form save fails', async () => {
    mockApi({
      form: mockBasicFormDraft,
    });

    const currentFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/forms/am-789/versions/v-1') && method === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Failed to save form' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
      return currentFetch(input, init);
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    await screen.findByRole('region', { name: /canvas/i }, { timeout: 32000 });

    const saveBtn = screen.getByRole('button', { name: 'Save form' });
    await user.click(saveBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toContain('Failed to save form');
  });

  it('shows spinner when saving form', async () => {
    mockApi({
      form: mockBasicFormDraft,
    });

    let resolveSave: (value: Response) => void;
    const savePromise = new Promise<Response>((resolve) => {
      resolveSave = resolve;
    });

    const currentFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/forms/am-789/versions/v-1') && method === 'PATCH') {
        return savePromise;
      }
      return currentFetch(input, init);
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    await screen.findByRole('region', { name: /canvas/i }, { timeout: 32000 });

    const saveBtn = screen.getByRole('button', { name: 'Save form' });
    await user.click(saveBtn);

    const saveButton = screen.getByRole('button', { name: /save form/i });
    expect(saveButton.querySelector('[data-slot="spinner"]')).toBeInTheDocument();

    resolveSave!(
      json({
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'draft',
        schema: {},
        createdAt: ISO,
      }),
    );

    await waitFor(() => {
      expect(saveButton.querySelector('[data-slot="spinner"]')).not.toBeInTheDocument();
    });
  });

  it('renders published basic-form layout with description preview', async () => {
    const mockBasicFormPublishedWithDesc = {
      form: {
        id: 'am-789',
        workspaceId: 'w1',
        title: 'Parking Application Published',
        kind: 'basic-form',
        createdAt: ISO,
      },
      version: {
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'published' as const,
        schema: {
          schema: {
            type: 'object',
            title: 'Parking Application Published',
            description: 'This is a description of the basic form',
            properties: {
              licensePlate: { type: 'string', title: 'License Plate' },
            },
          },
          uischema: {
            type: 'VerticalLayout',
            elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
          },
        },
        createdAt: ISO,
      },
    };
    mockApi({ form: mockBasicFormPublishedWithDesc });

    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    expect(
      await screen.findByText('This is a description of the basic form', undefined, {
        timeout: 16000,
      }),
    ).toBeInTheDocument();
  });

  it('falls back to form title when saving draft multi-stage-form with an empty/whitespace name', async () => {
    let savedBody: any = null;
    mockApi({
      form: mockMultiStageFormDraft,
      onSaveForm: (body) => {
        savedBody = body;
      },
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789');

    const nameInput = await screen.findByLabelText(/form name/i, undefined, { timeout: 32000 });
    await user.clear(nameInput);
    await user.type(nameInput, '   ');

    const saveBtn = screen.getByRole('button', { name: 'Save form' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(savedBody).not.toBeNull();
    });
    expect(savedBody.title).toBe('Complex Permit Application');
  });

  it('falls back to form title when schema title is empty string in published basic-form', async () => {
    const mockBasicFormEmptyTitlePublished = {
      form: {
        id: 'am-789',
        workspaceId: 'w1',
        title: '',
        kind: 'basic-form',
        createdAt: ISO,
      },
      version: {
        id: 'v-1',
        documentId: 'am-789',
        version: 1,
        status: 'published' as const,
        schema: {
          schema: {
            type: 'object',
            title: '   ',
            properties: {
              licensePlate: { type: 'string', title: 'License Plate' },
            },
          },
          uischema: {
            type: 'VerticalLayout',
            elements: [{ type: 'Control', scope: '#/properties/licensePlate' }],
          },
        },
        createdAt: ISO,
      },
    };
    mockApi({ form: mockBasicFormEmptyTitlePublished });
    const { container } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/am-789',
    );

    // Wait for the heading to render with empty text
    await waitFor(() => {
      const headings = Array.from(container.querySelectorAll('h2'));
      const heading = headings.find((h) => h.textContent !== 'Command Palette');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe('');
    });
  });
});
