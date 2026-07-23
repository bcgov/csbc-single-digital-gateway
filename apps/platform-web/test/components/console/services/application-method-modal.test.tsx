import { screen, waitFor, configure } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, renderApp } from '../../../support/render-app';

configure({ asyncUtilTimeout: 10000 });

const originalFetch = globalThis.fetch;

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

const mockFormTypes = {
  items: [
    {
      type: {
        id: 'type-basic',
        name: 'Basic Form',
        kind: 'basic-form',
      },
    },
    {
      type: {
        id: 'type-multistage',
        name: 'Multi-stage Form',
        kind: 'multi-stage-form',
      },
    },
  ],
};

const mockBasicReference = {
  id: 'ref-basic-123',
  relation: 'application_form' as const,
  position: 0,
  label: 'Untitled',
  targetDocumentId: 'doc-basic-789',
  targetVersionId: 'v-basic-1',
  targetKind: 'basic-form',
  targetTitle: 'Untitled',
  targetVersion: 1,
  targetStatus: 'draft',
  hasSubmissions: false,
};

const mockMultistageReference = {
  id: 'ref-multi-123',
  relation: 'application_form' as const,
  position: 0,
  label: 'Untitled multi-stage form',
  targetDocumentId: 'doc-multi-789',
  targetVersionId: 'v-multi-1',
  targetKind: 'multi-stage-form',
  targetTitle: 'Untitled multi-stage form',
  targetVersion: 1,
  targetStatus: 'draft',
  hasSubmissions: false,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi({
  onCreateForm,
}: {
  onCreateForm?: (body: any) => void;
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/auth/me')) {
      return json(authedUser);
    }
    if (url.includes('/v1/workspaces/by-slug/riverton')) {
      return json(mockWorkspace);
    }
    if (url.includes('/v1/workspaces')) {
      return json({ items: [mockWorkspace], total: 1, limit: 100, offset: 0 });
    }
    if (url.includes('/v1/document-types')) {
      return json(mockFormTypes);
    }
    if (url.includes('/v1/services/srv-123/versions/v-456/forms') && method === 'POST') {
      const body = JSON.parse(String(init?.body));
      if (onCreateForm) {
        onCreateForm(body);
      }
      if (body.typeId === 'type-basic') {
        return json(mockBasicReference);
      }
      return json(mockMultistageReference);
    }
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('ApplicationMethodModal', () => {
  it('renders the modal with basic, multi-stage options and coming-soon external link', async () => {
    mockApi();

    renderApp('/app/riverton/services/srv-123/versions/v-456/application-methods/new');

    // Dialog title and description should be present
    expect(
      await screen.findByRole('heading', { name: 'New application method' }, { timeout: 32000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Choose how applicants apply for this service.')).toBeInTheDocument();

    // Check application method options are visible
    expect(screen.getByRole('button', { name: /Basic form/i })).toBeInTheDocument();
    expect(
      screen.getByText('A single page of fields applicants complete and submit in one go.'),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Multi-stage form/i })).toBeInTheDocument();
    expect(
      screen.getByText('A guided flow split into stages, with conditional logic between them.'),
    ).toBeInTheDocument();

    // Check external link Coming soon card
    expect(screen.getByText('External link')).toBeInTheDocument();
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(
      screen.getByText('Send applicants to a form or service hosted elsewhere.'),
    ).toBeInTheDocument();
  });

  it('creates basic form and navigates to the edit page successfully', async () => {
    let createdBody: any = null;
    mockApi({
      onCreateForm: (body) => {
        createdBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/versions/v-456/application-methods/new',
    );

    const navigateSpy = vi.spyOn(router, 'navigate');

    // Click on Basic form button
    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    // Verify correct API body payload was sent
    await waitFor(() => {
      expect(createdBody).not.toBeNull();
    });
    expect(createdBody).toEqual({
      typeId: 'type-basic',
      title: 'Untitled',
      label: 'Untitled',
    });

    // Verify it navigated to the correct edit route for the created form
    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/app/$slug/services/$id/versions/$versionId/application-methods/$applicationMethodId',
          params: {
            slug: 'riverton',
            id: 'srv-123',
            versionId: 'v-456',
            applicationMethodId: 'doc-basic-789',
          },
        }),
      );
    });
  });

  it('creates multi-stage form and navigates to the edit page successfully', async () => {
    let createdBody: any = null;
    mockApi({
      onCreateForm: (body) => {
        createdBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/versions/v-456/application-methods/new',
    );

    const navigateSpy = vi.spyOn(router, 'navigate');

    // Click on Multi-stage form button
    const multiStageBtn = await screen.findByRole('button', { name: /Multi-stage form/i });
    await user.click(multiStageBtn);

    // Verify correct API body payload was sent
    await waitFor(() => {
      expect(createdBody).not.toBeNull();
    });
    expect(createdBody).toEqual({
      typeId: 'type-multistage',
      title: 'Untitled multi-stage form',
      label: 'Untitled multi-stage form',
    });

    // Verify it navigated to the correct edit route for the created form
    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/app/$slug/services/$id/versions/$versionId/application-methods/$applicationMethodId',
          params: {
            slug: 'riverton',
            id: 'srv-123',
            versionId: 'v-456',
            applicationMethodId: 'doc-multi-789',
          },
        }),
      );
    });
  });

  it('closes the modal and navigates back to service details when dismissed', async () => {
    mockApi();

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/versions/v-456/application-methods/new',
    );

    const navigateSpy = vi.spyOn(router, 'navigate');

    // Wait for the modal to be visible
    expect(
      await screen.findByRole('heading', { name: 'New application method' }),
    ).toBeInTheDocument();

    // Dismiss by pressing Escape
    await user.keyboard('{Escape}');

    // Verify it navigated back to the service detail page
    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/app/$slug/services/$id',
          params: {
            slug: 'riverton',
            id: 'srv-123',
          },
        }),
      );
    });
  });

  it('shows error message when form creation fails', async () => {
    const fetchMock = mockApi();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/services/srv-123/versions/v-456/forms') && method === 'POST') {
        return new Response(JSON.stringify({ message: 'Failed to create form' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspace);
      if (url.includes('/v1/workspaces'))
        return json({ items: [mockWorkspace], total: 1, limit: 100, offset: 0 });
      if (url.includes('/v1/document-types')) return json(mockFormTypes);
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/versions/v-456/application-methods/new');

    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toContain('Failed to create form');
  });

  it('shows error message when form type is unavailable', async () => {
    const fetchMock = mockApi();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/document-types')) {
        return json({ items: [] });
      }
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspace);
      if (url.includes('/v1/workspaces'))
        return json({ items: [mockWorkspace], total: 1, limit: 100, offset: 0 });
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/versions/v-456/application-methods/new');

    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toContain('Basic form type unavailable');
  });

  it('does not close the modal if form creation is pending', async () => {
    let resolveCreate!: (value: Response) => void;
    const createPromise = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    const fetchMock = mockApi();
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/services/srv-123/versions/v-456/forms') && method === 'POST') {
        return createPromise;
      }
      if (url.includes('/auth/me')) return json(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return json(mockWorkspace);
      if (url.includes('/v1/workspaces'))
        return json({ items: [mockWorkspace], total: 1, limit: 100, offset: 0 });
      if (url.includes('/v1/document-types')) return json(mockFormTypes);
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/versions/v-456/application-methods/new',
    );

    const navigateSpy = vi.spyOn(router, 'navigate');

    // Click Basic form button to trigger mutation and make it pending
    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    // Verify spinner is rendered
    expect(basicFormBtn.querySelector('.animate-spin')).toBeInTheDocument();

    // Try to dismiss by pressing Escape
    await user.keyboard('{Escape}');

    // Modal title should still be in the document
    expect(screen.getByRole('heading', { name: 'New application method' })).toBeInTheDocument();

    // Verify it did not navigate
    expect(navigateSpy).not.toHaveBeenCalled();

    // Resolve the creation to clean up
    resolveCreate(json(mockBasicReference));
  });
});
