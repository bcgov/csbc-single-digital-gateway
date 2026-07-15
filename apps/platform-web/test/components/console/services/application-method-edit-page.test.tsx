import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../../support/render-app';

const originalFetch = globalThis.fetch;

if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('CAPTURED WINDOW ERROR:', e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('CAPTURED UNHANDLED REJECTION:', e.reason);
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
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

describe('ApplicationMethodEditPage', () => {
  it.skip('renders loading spinner when loading form data', async () => {
    let resolveFormQuery: any;
    const formQueryPromise = new Promise((resolve) => {
      resolveFormQuery = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) {
        return json(authedUser);
      }
      if (url.includes('/v1/workspaces/by-slug/riverton')) {
        return json(mockWorkspace);
      }
      if (url.includes('/v1/workspaces')) {
        return json({ items: [mockWorkspace], total: 1, limit: 100, offset: 0 });
      }
      if (url.includes('/v1/forms/am-789')) {
        await formQueryPromise;
        return json(mockBasicFormDraft);
      }
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { container } = renderApp(
      '/app/riverton/services/srv-123/versions/v-456/application-methods/am-789',
    );

    // The container should render the spinner
    await waitFor(() => {
      expect(container.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
    });

    resolveFormQuery(null);
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
      '/app/riverton/services/srv-123/versions/v-456/application-methods/am-789',
    );

    // Should display the sidebar with active slug context, as well as builder regions
    expect(await screen.findByRole('region', { name: /canvas/i })).toBeInTheDocument();
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
        to: '/app/$slug/services/$id',
        params: { slug: 'riverton', id: 'srv-123' },
      }),
    );
  });

  it('renders published basic-form layout as read-only preview', async () => {
    mockApi({ form: mockBasicFormPublished });

    renderApp('/app/riverton/services/srv-123/versions/v-456/application-methods/am-789');

    // Should display status badge
    expect(await screen.findByText('published')).toBeInTheDocument();

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
      '/app/riverton/services/srv-123/versions/v-456/application-methods/am-789',
    );

    // Should render StageBuilder elements
    expect(await screen.findByRole('button', { name: /add stage/i })).toBeInTheDocument();
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
        to: '/app/$slug/services/$id',
        params: { slug: 'riverton', id: 'srv-123' },
      }),
    );
  });

  it('renders published multi-stage-form layout as read-only stage outline', async () => {
    mockApi({ form: mockMultiStageFormPublished });

    renderApp('/app/riverton/services/srv-123/versions/v-456/application-methods/am-789');

    // Should display the header and stage outline
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Complex Permit Application Published',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Multi stage form published description')).toBeInTheDocument();

    // Check outline content
    expect(screen.getByText('1. Stage 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1')).toBeInTheDocument();

    // StageBuilder canvas button should not be present
    expect(screen.queryByRole('button', { name: /add stage/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save form' })).not.toBeInTheDocument();
  });
});
