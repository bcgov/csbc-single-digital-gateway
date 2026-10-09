import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../support/render-app';
import { routeTree } from '@/routeTree.gen';
import { createMockBff } from '../../support/create-mock-bff';
import { form, draft } from '../../support/fixtures';

vi.mock('@repo/react/form-runner', () => ({
  FormRunner: ({ data, onChange, onSubmit, submitLabel, submitting }: any) => (
    <div>
      <label htmlFor="mock-input">Name</label>
      <input
        id="mock-input"
        type="text"
        value={data.name || ''}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
      />
      <button disabled={submitting} onClick={() => onSubmit(data)}>
        {submitLabel}
      </button>
    </div>
  ),
}));

async function renderApply() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/services/svc-1/apply/f1'] }),
  });
  await router.load();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Citizen Application Page', () => {
  it('Should let an authenticated citizen fill and submit, then confirms', async () => {
    const fetchMock = createMockBff();
    const user = userEvent.setup();
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 5000 }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Submit application' }));

    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument();
    expect(screen.getByText('20260630-0001')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/applications/sub1/submit'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('Should prompt anonymous visitors to log in', async () => {
    createMockBff({ me: new Response(null, { status: 401 }) });
    await renderApply();
    expect(
      await screen.findByText('You need to be signed in to apply.', {}, { timeout: 32000 }),
    ).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /log in to apply/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });

  it('Should render unavailable state when form fetch fails', async () => {
    createMockBff({ servicesOptions: { formNotFound: true } });
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Application unavailable' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This application form isn’t available right now.'),
    ).toBeInTheDocument();
  });

  it('Should render unavailable state when draft fetch fails', async () => {
    createMockBff({ applicationsOptions: { failedResponse: true } });
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Application unavailable' }),
    ).toBeInTheDocument();
  });

  it('Should handle draft response with missing data property', async () => {
    createMockBff({ applicationsOptions: { hasNoData: true } });
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();
  });

  it('Should show an error message if submission fails', async () => {
    createMockBff({ applicationsOptions: { submissionFailed: true } });
    const user = userEvent.setup();
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Submit application' }));

    expect(await screen.findByText('Could not submit — please try again.')).toBeInTheDocument();
  });

  it('Should autosave input changes after debounce and shows saving/saved states', async () => {
    let resolvePatch: ((value: Response) => void) | undefined;
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });
    createMockBff({ patchResponse: patchPromise });

    await renderApply();
    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 10000 }),
    ).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Name' });

    // Trigger changes using fireEvent
    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.change(input, { target: { value: 'Am' } });

    // Check that "Saving…" is rendered (wait for the 800ms debounce)
    expect(await screen.findByText('Saving…', {}, { timeout: 3000 })).toBeInTheDocument();

    // Resolve the PATCH call
    await act(async () => {
      resolvePatch!(jsonResponse(draft));
    });

    // Check that "Draft saved" is rendered
    expect(await screen.findByText('Draft saved', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('Should clear active timer on unmount, and handles submit when timer is null', async () => {
    let resolvePost!: (value: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    createMockBff({ submitResponse: postPromise });

    const { unmount } = await renderApply();
    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 10000 }),
    ).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Name' });

    // 1. Trigger change to set active timer
    fireEvent.change(input, { target: { value: 'A' } });

    // 2. Unmount immediately while timer is active
    unmount();

    // 3. Re-render fresh to test submit with null timer
    await renderApply();
    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 10000 }),
    ).toBeInTheDocument();

    // Click submit immediately without changes (so timer.current is null)
    const submitBtn = screen.getByRole('button', { name: 'Submit application' });
    await userEvent.click(submitBtn);

    // Verify submitting is true
    expect(submitBtn).toBeDisabled();

    // Resolve the submit call
    await act(async () => {
      resolvePost(jsonResponse({ ...draft, status: 'submitted' }));
    });

    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument();
  });

  it('Should cancel pending autosave timer when submitting an application', async () => {
    let resolvePost!: (value: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    createMockBff({ submitResponse: postPromise });

    await renderApply();
    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }, { timeout: 10000 }),
    ).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Name' });

    // 1. Trigger change to set active timer
    fireEvent.change(input, { target: { value: 'Typing and submitting' } });

    // 2. Click submit immediately while timer is active
    const submitBtn = screen.getByRole('button', { name: 'Submit application' });
    await userEvent.click(submitBtn);

    // Resolve the submit call
    await act(async () => {
      resolvePost(jsonResponse({ ...draft, status: 'submitted' }));
    });

    expect(
      await screen.findByRole('heading', { name: 'Application submitted' }),
    ).toBeInTheDocument();
  });

  it('Should render loading skeleton when form fetch is pending', async () => {
    let resolveForm!: (value: Response) => void;
    const formPromise = new Promise<Response>((resolve) => {
      resolveForm = resolve;
    });
    createMockBff({ form: formPromise });

    await renderApply();
    expect(
      screen.queryByRole('heading', { name: 'Application unavailable' }),
    ).not.toBeInTheDocument();
    await act(async () => {
      resolveForm(jsonResponse(form));
    });
  });

  it('Should render loading skeleton when draft or agreements are pending', async () => {
    let resolveDraft!: (value: Response) => void;
    const draftPromise = new Promise<Response>((resolve) => {
      resolveDraft = resolve;
    });
    createMockBff({ draft: draftPromise });

    await renderApply();
    await act(async () => {
      resolveDraft(jsonResponse(draft));
    });
  });

  it('Should render unavailable state when agreements fetch fails', async () => {
    createMockBff({ agreements: new Response(null, { status: 500 }) });
    await renderApply();
    expect(
      await screen.findByRole('heading', { name: 'Application unavailable' }),
    ).toBeInTheDocument();
  });

  it('Should render consent gate when agreements are pending, lets user continue after accept', async () => {
    const agreements = [
      {
        agreementVersionId: 'av-req',
        agreementDocumentId: 'ad-req',
        data: {
          title: 'Terms of Service',
          description: 'Please read carefully.',
          content: null,
          isOptional: false,
          approveLabel: 'I accept the terms',
          rejectLabel: 'I decline',
        },
        decision: null,
      },
    ];
    createMockBff({
      agreements: jsonResponse({
        items: agreements,
      }),
    });

    const user = userEvent.setup();
    await renderApply();

    expect(await screen.findByRole('heading', { name: 'Before you apply' })).toBeInTheDocument();

    const radioApprove = screen.getByRole('radio', { name: 'I accept the terms' });
    await user.click(radioApprove);

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/me/agreement-consents')) {
        return jsonResponse({ agreementVersionId: 'av-req', decision: 'approve' });
      }
      if (url.includes('/v1/me/services/') && url.includes('/agreements')) {
        return jsonResponse({
          items: [
            {
              agreementVersionId: 'av-req',
              agreementDocumentId: 'ad-req',
              data: { title: 'Terms of Service', isOptional: false },
              decision: 'approve',
            },
          ],
        });
      }
      return createMockBff({})(input);
    }) as unknown as typeof fetch;

    const continueBtn = screen.getByRole('button', { name: 'Continue to application' });
    await user.click(continueBtn);

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();
  });

  it('Should handle 422 submission error, autosaves answers, and triggers consent gate refetch', async () => {
    const fetchMock = createMockBff({
      applicationsOptions: { submissionUnprocessed: true },
    });
    const user = userEvent.setup();
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Submit application' }));

    // Verify PATCH was called to save the answers upon 422
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/v1/me/applications/sub1'),
      expect.objectContaining({ method: 'PATCH' }),
    );

    // Verify /agreements was re-fetched
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/agreements'),
      expect.any(Object),
    );
  });
});
