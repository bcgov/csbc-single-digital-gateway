import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const T = { timeout: 10000 };
const service = {
  id: 'svc-1',
  title: 'Service One',
  description: null,
  publishedVersionId: 'ver-3',
  versionNumber: 3,
  publishedAt: '2026-10-01T00:00:00.000Z',
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', elements: [] } },
  data: {},
  applicationMethods: [{ id: 'm1', title: 'Apply online', description: 'Takes ten minutes.' }],
};
const control = (key: string, label: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  label,
});
const methodSchema = {
  type: 'object',
  properties: { name: { type: 'string' }, staffNote: { type: 'string' } },
};
const method = (variants: Record<string, unknown>) => ({
  id: 'm1',
  versionId: 'mv-2',
  title: 'Apply online',
  description: 'Takes ten minutes.',
  schema: methodSchema,
  variants,
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const ME = { id: 'u1', roles: [], claims: { sub: 'citizen-1', name: 'Jane Citizen' } };
const draft = (data: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  formId: 'm1',
  formVersionId: 'mv-2',
  status: 'draft',
  data,
  reference: '20261013-0001',
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
  submittedAt: null,
});

interface Bff {
  signedIn?: boolean;
  draftData?: Record<string, unknown>;
  submit?: () => Response;
}

/** The citizen BFF: catalog reads, `/auth/me`, and the draft lifecycle — every write recorded. */
function mockBff(
  methodResponse: () => Response,
  { signedIn = true, draftData = {}, submit }: Bff = {},
) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const verb = (init?.method ?? 'GET').toUpperCase();
    const path = new URL(url).pathname;
    if (verb !== 'GET')
      calls.push({
        method: verb,
        path,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
    if (url.includes('/application-methods/')) return methodResponse();
    if (/\/v1\/services\/[^/?]+$/.test(url)) return json(service);
    if (url.includes('/auth/me')) return signedIn ? json(ME) : new Response(null, { status: 401 });
    if (path === '/v1/me/applications' && verb === 'POST') return json(draft(draftData));
    if (path === '/v1/me/applications/sub-1' && verb === 'PATCH')
      return json(
        draft((JSON.parse(String(init?.body)) as { data: Record<string, unknown> }).data),
      );
    if (path === '/v1/me/applications/sub-1/submit')
      return submit?.() ?? json({ ...draft(), status: 'pending' });
    if (path === '/v1/me/applications/sub-1')
      return json({
        ...draft(),
        status: 'pending',
        statusLabel: 'Submitted',
        formTitle: 'Apply online',
        structure: { schema: methodSchema, variants: { default: { type: 'Form', elements: [] } } },
        reviewReason: null,
      });
    if (url.includes('/v1/me/applications')) return json({ items: [] });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return { calls };
}

/**
 * JSONForms hands the host its answers after a 10ms debounce (`@jsonforms/react`), and `userEvent` types and clicks with
 * no gap at all — so a click right after typing can read the answers from before the last keystroke. A person can't
 * click inside 10ms; the test waits it out.
 */
const settleAnswers = () => new Promise((resolve) => setTimeout(resolve, 50));

const NAME_FORM = method({ default: { type: 'Form', elements: [control('name', 'Your name')] } });

async function renderRoute(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

// Doc 291.
describe('ApplyPage (doc 291 rules 10-11)', () => {
  describe('render', () => {
    it('fills the method citizen variant in a DocumentRunner without submit, under service and method titles', async () => {
      mockBff(() =>
        json(
          method({
            default: {
              type: 'Form',
              label: 'Staff form',
              elements: [control('staffNote', 'Staff note')],
            },
            citizen: {
              type: 'Form',
              label: 'Citizen form',
              elements: [control('name', 'Your name')],
            },
          }),
        ),
      );
      await renderRoute('/services/svc-1/apply/m1');

      expect(
        await screen.findByRole('heading', { name: 'Apply online', level: 1 }, T),
      ).toBeInTheDocument();
      expect(screen.getByText('Takes ten minutes.')).toBeInTheDocument();
      expect(await screen.findByLabelText('Your name', undefined, T)).toBeInTheDocument();
      // The Citizen variant, not the staff default — and its own title isn't drawn twice.
      expect(screen.queryByLabelText('Staff note')).toBeNull();
      expect(screen.queryByText('Citizen form')).toBeNull();
      // Doc 292 rule 6 (superseding doc 291 rule 10): the draft can be saved and submitted.
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
      expect(screen.getByRole('link', { name: 'Service One' })).toHaveAttribute(
        'href',
        '/services/svc-1',
      );
    });

    it('falls back to the default variant', async () => {
      mockBff(() =>
        json(method({ default: { type: 'Form', elements: [control('name', 'Full name')] } })),
      );
      await renderRoute('/services/svc-1/apply/m1');

      expect(await screen.findByLabelText('Full name', undefined, T)).toBeInTheDocument();
    });
  });

  describe('not found', () => {
    it('shows This application is not available with a link back to the service', async () => {
      mockBff(() => json({ statusCode: 404, message: 'Application method not found' }, 404));
      await renderRoute('/services/svc-1/apply/nope');

      expect(
        await screen.findByRole('heading', { name: 'This application isn’t available.' }, T),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to the service' })).toHaveAttribute(
        'href',
        '/services/svc-1',
      );
      expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
    });
  });
});

// Doc 292.
describe('ApplyPage — submissions (doc 292 rules 1, 6)', () => {
  describe('signed out', () => {
    it('asks the citizen to log in and returns to the apply page', async () => {
      const { calls } = mockBff(() => json(NAME_FORM), { signedIn: false });
      await renderRoute('/services/svc-1/apply/m1');

      const login = await screen.findByRole('link', { name: 'Log in to apply' }, T);
      expect(login.getAttribute('href')).toContain(encodeURIComponent('/services/svc-1/apply/m1'));
      expect(screen.queryByLabelText('Your name')).toBeNull();
      // No draft is created for a signed-out visitor.
      expect(calls).toEqual([]);
    });
  });

  describe('signed in', () => {
    it('creates or resumes the draft on the published version and seeds the form with its answers', async () => {
      const { calls } = mockBff(() => json(NAME_FORM), { draftData: { name: 'Jane' } });
      await renderRoute('/services/svc-1/apply/m1');

      expect(await screen.findByLabelText('Your name', undefined, T)).toHaveValue('Jane');
      expect(calls).toContainEqual({
        method: 'POST',
        path: '/v1/me/applications',
        body: { formVersionId: 'mv-2' },
      });
    });

    it('Save draft stores the answers', async () => {
      const { calls } = mockBff(() => json(NAME_FORM));
      await renderRoute('/services/svc-1/apply/m1');
      await userEvent.type(await screen.findByLabelText('Your name', undefined, T), 'Jane');

      await settleAnswers();
      await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

      await waitFor(
        () =>
          expect(calls).toContainEqual({
            method: 'PATCH',
            path: '/v1/me/applications/sub-1',
            body: { data: { name: 'Jane' } },
          }),
        T,
      );
      expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
    });

    it('Submit sends the answers and opens the application page', async () => {
      const { calls } = mockBff(() => json(NAME_FORM));
      await renderRoute('/services/svc-1/apply/m1');
      await userEvent.type(await screen.findByLabelText('Your name', undefined, T), 'Jane');

      await settleAnswers();
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(
        () =>
          expect(calls).toContainEqual({
            method: 'POST',
            path: '/v1/me/applications/sub-1/submit',
            body: { data: { name: 'Jane' } },
          }),
        T,
      );
      expect(await screen.findByText(/Ref #20261013-0001/, undefined, T)).toBeInTheDocument();
    });

    it('shows the API validation errors and keeps the answers', async () => {
      mockBff(() => json(NAME_FORM), {
        submit: () =>
          json(
            { message: 'The application has validation errors', errors: ['name is too short'] },
            422,
          ),
      });
      await renderRoute('/services/svc-1/apply/m1');
      const field = await screen.findByLabelText('Your name', undefined, T);
      await userEvent.type(field, 'J');

      await settleAnswers();
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('The application has validation errors');
      expect(alert).toHaveTextContent('name is too short');
      expect(screen.getByLabelText('Your name')).toHaveValue('J');
    });
  });
});
