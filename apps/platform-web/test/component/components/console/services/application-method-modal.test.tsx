import { screen, waitFor, configure } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, jsonResponse, renderApp } from '../../../../support/render-app';
import { adminWorkspace, mockBasicFormDraft, mockFormTypes } from '../../../../support/fixtures';
import { originalFetch } from '../../../../support/vi-fixtures';
import { mockApplicationsBff } from '../../../../support/mock-applications-bff';

vi.mock('@repo/ui/button', () => {
  return {
    Button: ({ disabled, onClick, ...props }: any) => {
      return <button onClick={onClick} data-disabled={disabled ? 'true' : undefined} {...props} />;
    },
  };
});

configure({ asyncUtilTimeout: 10000 });

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

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

describe('Application Method Modal Component Test Suite', () => {
  it('Should render the modal with basic, multi-stage options and coming-soon external link', async () => {
    mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });

    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new');

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

    // Check external link card
    expect(screen.getByText('External link')).toBeInTheDocument();
    expect(
      screen.getByText('Send applicants to a form or service hosted elsewhere.'),
    ).toBeInTheDocument();
  });

  it('Should create basic form and navigate to the edit page successfully', async () => {
    let createdBody: any = null;
    mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
      onCreateForm: (body) => {
        createdBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new',
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
          to: '/app/$slug/services/$id/old/edit/versions/$versionId/application-methods/$applicationMethodId',
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

  it('Should create multi-stage form and navigate to the edit page successfully', async () => {
    let createdBody: any = null;
    mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
      onCreateForm: (body) => {
        createdBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new',
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
          to: '/app/$slug/services/$id/old/edit/versions/$versionId/application-methods/$applicationMethodId',
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

  it('Should close the modal and navigate back to service details when dismissed', async () => {
    mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new',
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
          to: '/app/$slug/services/$id/old/edit',
          params: {
            slug: 'riverton',
            id: 'srv-123',
          },
        }),
      );
    });
  });

  it('Should show error message when form creation fails', async () => {
    const fetchMock = mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/services/srv-123/versions/v-456/forms') && method === 'POST') {
        return new Response(JSON.stringify({ message: 'Failed to create form' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return jsonResponse(adminWorkspace);
      if (url.includes('/v1/workspaces'))
        return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
      if (url.includes('/v1/document-types')) return jsonResponse(mockFormTypes);
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new');

    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toContain('Failed to create form');
  });

  it('Should show error message when form type is unavailable', async () => {
    const fetchMock = mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/document-types')) {
        return jsonResponse({ items: [] });
      }
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return jsonResponse(adminWorkspace);
      if (url.includes('/v1/workspaces'))
        return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new');

    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toContain('Basic form type unavailable');
  });

  it('Should not close the modal if form creation is pending', async () => {
    let resolveCreate!: (value: Response) => void;
    const createPromise = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    const fetchMock = mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/services/srv-123/versions/v-456/forms') && method === 'POST') {
        return createPromise;
      }
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return jsonResponse(adminWorkspace);
      if (url.includes('/v1/workspaces'))
        return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
      if (url.includes('/v1/document-types')) return jsonResponse(mockFormTypes);
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new',
    );

    const navigateSpy = vi.spyOn(router, 'navigate');

    // Click Basic form button to trigger mutation and make it pending
    const basicFormBtn = await screen.findByRole('button', { name: /Basic form/i });
    await user.click(basicFormBtn);

    // Verify spinner is rendered
    expect(basicFormBtn.querySelector('[data-slot="spinner"]')).toBeInTheDocument();

    // Try to dismiss by pressing Escape
    await user.keyboard('{Escape}');

    // Modal title should still be in the document
    expect(screen.getByRole('heading', { name: 'New application method' })).toBeInTheDocument();

    // Verify it did not navigate
    expect(navigateSpy).not.toHaveBeenCalled();

    // Resolve the creation to clean up
    resolveCreate(jsonResponse(mockBasicReference));
  });

  it('Should create external link and navigate back to service details page successfully', async () => {
    let createdBody: any = null;
    mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
      onCreateExternal: (body) => {
        createdBody = body;
      },
    });

    const user = userEvent.setup();
    const { router } = renderApp(
      '/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new',
    );

    const navigateSpy = vi.spyOn(router, 'navigate');

    // Click "External link" button
    const externalLinkBtn = await screen.findByRole('button', { name: /External link/i });
    await user.click(externalLinkBtn);

    // Verify step changes (External link heading is present)
    expect(screen.getByRole('heading', { name: 'External link' })).toBeInTheDocument();

    // Type in fields
    const labelInput = screen.getByLabelText('Label');
    const urlInput = screen.getByLabelText('Link URL');
    await user.type(labelInput, 'Apply at gov.bc.ca');
    await user.type(urlInput, 'https://gov.bc.ca/custom-form');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Add link' });
    await user.click(submitBtn);

    // Verify correct API body payload was sent
    await waitFor(() => {
      expect(createdBody).not.toBeNull();
    });
    expect(createdBody).toEqual({
      label: 'Apply at gov.bc.ca',
      url: 'https://gov.bc.ca/custom-form',
    });

    // Verify it navigated back to the service detail page
    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/app/$slug/services/$id/old/edit',
          params: {
            slug: 'riverton',
            id: 'srv-123',
          },
        }),
      );
    });
  });

  it('Should allow cancelling from external link step and returning to choose step', async () => {
    mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new');

    // Click "External link" button to go to step 'external'
    const externalLinkBtn = await screen.findByRole('button', { name: /External link/i });
    await user.click(externalLinkBtn);

    // Click cancel button
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelBtn);

    // Verify step reverts back to choosing step
    expect(screen.getByRole('heading', { name: 'New application method' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Basic form/i })).toBeInTheDocument();
  });

  it('Should show error message when external link creation fails', async () => {
    const fetchMock = mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (
        url.includes('/v1/services/srv-123/versions/v-456/external-applications') &&
        method === 'POST'
      ) {
        return new Response(JSON.stringify({ message: 'Failed to create external link' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return jsonResponse(adminWorkspace);
      if (url.includes('/v1/workspaces'))
        return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
      if (url.includes('/v1/document-types')) return jsonResponse(mockFormTypes);
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new');

    const externalLinkBtn = await screen.findByRole('button', { name: /External link/i });
    await user.click(externalLinkBtn);

    const labelInput = screen.getByLabelText('Label');
    const urlInput = screen.getByLabelText('Link URL');
    await user.type(labelInput, 'BC Gov Service');
    await user.type(urlInput, 'https://gov.bc.ca');

    const submitBtn = screen.getByRole('button', { name: 'Add link' });
    await user.click(submitBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toContain('Failed to create external link');
  });

  it('Should not allow cancelling from external link step if creation is pending', async () => {
    let resolveCreate!: (value: Response) => void;
    const createPromise = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });

    const fetchMock = mockApplicationsBff(mockBasicFormDraft, {
      testFile: 'application-method-modal.test',
      mockFormTypes,
      mockBasicReference,
      mockMultistageReference,
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (
        url.includes('/v1/services/srv-123/versions/v-456/external-applications') &&
        method === 'POST'
      ) {
        return createPromise;
      }
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/workspaces/by-slug/riverton')) return jsonResponse(adminWorkspace);
      if (url.includes('/v1/workspaces'))
        return jsonResponse({ items: [adminWorkspace], total: 1, limit: 100, offset: 0 });
      if (url.includes('/v1/document-types')) return jsonResponse(mockFormTypes);
      return new Response(null, { status: 404 });
    });

    const user = userEvent.setup();
    renderApp('/app/riverton/services/srv-123/old/edit/versions/v-456/application-methods/new');

    // Click "External link" button to go to step 'external'
    const externalLinkBtn = await screen.findByRole('button', { name: /External link/i });
    await user.click(externalLinkBtn);

    const labelInput = screen.getByLabelText('Label');
    const urlInput = screen.getByLabelText('Link URL');
    await user.type(labelInput, 'BC Gov Service');
    await user.type(urlInput, 'https://gov.bc.ca');

    const submitBtn = screen.getByRole('button', { name: 'Add link' });
    await user.click(submitBtn);

    // Wait for mutation to be pending (Cancel button gets disabled)
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await waitFor(() => {
      expect(cancelBtn).toHaveAttribute('data-disabled', 'true');
    });

    // Click cancel button while pending (since it's not disabled in DOM, this will fire onClick)
    await user.click(cancelBtn);

    // Verify it is still on the external step
    expect(screen.getByRole('heading', { name: 'External link' })).toBeInTheDocument();

    // Resolve the creation to clean up
    resolveCreate(jsonResponse({}));
  });
});
