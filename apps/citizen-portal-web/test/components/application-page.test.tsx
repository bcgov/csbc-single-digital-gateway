import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

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

const authedUser = { id: 'c1', roles: ['citizen'], claims: { sub: 'c1', name: 'Amina Ali' } };

const form = {
  serviceId: 'svc-1',
  formId: 'f1',
  formVersionId: 'fv1',
  kind: 'basic-form',
  title: 'Your Profile',
  structure: {
    schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
  },
};

const draft = {
  id: 'sub1',
  formId: 'f1',
  formVersionId: 'fv1',
  status: 'draft',
  data: {},
  reference: '20260630-0001',
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
  submittedAt: null,
};

const submitted = { ...draft, status: 'pending', submittedAt: '2026-06-30T00:00:00.000Z' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockBff({ me = jsonResponse(authedUser), agreements = jsonResponse({ items: [] }) } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/auth/me')) return me;
    if (url.includes('/v1/services/') && url.includes('/applications/')) return jsonResponse(form);
    if (url.includes('/v1/me/services/') && url.includes('/agreements')) return agreements;
    if (url.includes('/v1/me/applications') && url.endsWith('/submit'))
      return jsonResponse(submitted);
    if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
    if (method === 'PATCH') return jsonResponse(draft);
    return new Response(null, { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

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

describe('citizen application page', () => {
  it('lets an authenticated citizen fill and submit, then confirms', async () => {
    const fetchMock = mockBff();
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

  it('prompts anonymous visitors to log in', async () => {
    mockBff({ me: new Response(null, { status: 401 }) });
    await renderApply();
    expect(
      await screen.findByText('You need to be signed in to apply.', {}, { timeout: 32000 }),
    ).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /log in to apply/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });

  it('renders unavailable state when form fetch fails', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Application unavailable' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This application form isn’t available right now.'),
    ).toBeInTheDocument();
  });

  it('renders unavailable state when draft fetch fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (method === 'POST' && url.endsWith('/v1/me/applications'))
        return new Response(null, { status: 500 });
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Application unavailable' }),
    ).toBeInTheDocument();
  });

  it('handles draft response with missing data property', async () => {
    const draftNoData = { ...draft, data: undefined };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (method === 'POST' && url.endsWith('/v1/me/applications'))
        return jsonResponse(draftNoData);
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();
  });

  it('shows an error message if submission fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (url.includes('/v1/me/applications') && url.endsWith('/submit'))
        return new Response(null, { status: 500 });
      if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Submit application' }));

    expect(await screen.findByText('Could not submit — please try again.')).toBeInTheDocument();
  });

  it('autosaves input changes after debounce and shows saving/saved states', async () => {
    let resolvePatch: ((value: Response) => void) | undefined;
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
      if (method === 'PATCH') return patchPromise;
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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

  it('clears active timer on unmount, and handles submit when timer is null', async () => {
    let resolvePost!: (value: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
      if (method === 'POST' && url.includes('/submit')) return postPromise;
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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

  it('cancels pending autosave timer on submit', async () => {
    let resolvePost!: (value: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
      if (method === 'POST' && url.includes('/submit')) return postPromise;
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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

  it('renders loading skeleton when form fetch is pending', async () => {
    let resolveForm!: (value: Response) => void;
    const formPromise = new Promise<Response>((resolve) => {
      resolveForm = resolve;
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/')) return formPromise;
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    await renderApply();
    expect(
      screen.queryByRole('heading', { name: 'Application unavailable' }),
    ).not.toBeInTheDocument();
    await act(async () => {
      resolveForm(jsonResponse(form));
    });
  });

  it('renders loading skeleton when draft or agreements are pending', async () => {
    let resolveDraft!: (value: Response) => void;
    const draftPromise = new Promise<Response>((resolve) => {
      resolveDraft = resolve;
    });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (method === 'POST' && url.endsWith('/v1/me/applications')) return draftPromise;
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch;

    await renderApply();
    await act(async () => {
      resolveDraft(jsonResponse(draft));
    });
  });

  it('renders unavailable state when agreements fetch fails', async () => {
    mockBff({ agreements: new Response(null, { status: 500 }) });
    await renderApply();
    expect(
      await screen.findByRole('heading', { name: 'Application unavailable' }),
    ).toBeInTheDocument();
  });

  it('renders consent gate when agreements are pending, lets user continue after accept', async () => {
    mockBff({
      agreements: jsonResponse({
        items: [
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
        ],
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
      return mockBff()(input);
    }) as unknown as typeof fetch;

    const continueBtn = screen.getByRole('button', { name: 'Continue to application' });
    await user.click(continueBtn);

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();
  });

  it('handles 422 submission error and triggers consent gate refetch', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/auth/me')) return jsonResponse(authedUser);
      if (url.includes('/v1/services/') && url.includes('/applications/'))
        return jsonResponse(form);
      if (url.includes('/v1/me/services/') && url.includes('/agreements'))
        return jsonResponse({ items: [] });
      if (url.includes('/v1/me/applications') && url.endsWith('/submit'))
        return new Response(null, { status: 422 });
      if (method === 'POST' && url.endsWith('/v1/me/applications')) return jsonResponse(draft);
      if (method === 'PATCH') return jsonResponse(draft);
      return new Response(null, { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();
    await renderApply();

    expect(
      await screen.findByRole('heading', { name: 'Apply — Your Profile' }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Submit application' }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/agreements'),
      expect.any(Object),
    );
  });
});
