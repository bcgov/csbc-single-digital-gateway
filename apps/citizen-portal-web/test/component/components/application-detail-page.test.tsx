import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';

const T = { timeout: 10000 };
const ME = { id: 'u1', roles: [], claims: { sub: 'citizen-1', name: 'Jane Citizen' } };
const structure = {
  schema: { type: 'object', properties: { name: { type: 'string' } } },
  variants: {
    default: {
      type: 'Form',
      elements: [{ type: 'Control', scope: '#/properties/name', label: 'Staff name' }],
    },
    Citizen: {
      type: 'Form',
      elements: [{ type: 'Control', scope: '#/properties/name', label: 'Your name' }],
    },
  },
};
const detail = (over: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  reference: '20261013-0001',
  status: 'pending',
  statusLabel: 'Submitted',
  formId: 'm1',
  formVersionId: 'mv-1',
  formTitle: 'Apply online',
  structure,
  data: { name: 'Jane Citizen' },
  reviewReason: null,
  createdAt: '2026-10-13T00:00:00.000Z',
  updatedAt: '2026-10-13T00:00:00.000Z',
  submittedAt: '2026-10-13T00:00:00.000Z',
  ...over,
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** One application whose server state moves as the real one does: revise → draft, submit → pending. */
function mockBff({ signedIn = true, initial = detail() as Record<string, unknown> | null } = {}) {
  let current = initial;
  const calls: { method: string; path: string; body?: unknown }[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method !== 'GET')
      calls.push({
        method,
        path: url.pathname,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
    if (url.pathname === '/auth/me')
      return signedIn ? json(ME) : new Response(null, { status: 401 });
    if (url.pathname === '/v1/me/applications/sub-1/revise' && current) {
      current = {
        ...current,
        status: 'draft',
        statusLabel: 'Draft',
        updatedAt: '2026-10-13T01:00:00.000Z',
      };
      return json(current);
    }
    if (url.pathname === '/v1/me/applications/sub-1/submit' && current) {
      const body = JSON.parse(String(init?.body)) as { data: Record<string, unknown> };
      current = { ...current, status: 'pending', statusLabel: 'Submitted', data: body.data };
      return json(current);
    }
    if (url.pathname === '/v1/me/applications/sub-1')
      return current === null
        ? json({ statusCode: 404, message: 'Not found' }, 404)
        : json(current);
    if (url.pathname.startsWith('/v1/me/')) return json({ items: [] });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  return { calls };
}

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

// Doc 292.
describe('ApplicationDetailPage (doc 292 rules 8, 10)', () => {
  describe('read', () => {
    it('shows the method title, reference, status and the submitted answers', async () => {
      mockBff();
      await renderRoute('/applications/sub-1');

      expect(
        await screen.findByRole('heading', { name: 'Apply online', level: 1 }, T),
      ).toBeInTheDocument();
      expect(screen.getByText('Ref #20261013-0001')).toBeInTheDocument();
      expect(screen.getByText('Jane Citizen')).toBeInTheDocument();
      // Read back over the Citizen variant, not the staff default.
      expect(screen.getByText('Your name')).toBeInTheDocument();
      expect(screen.queryByText('Staff name')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Revise' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    });

    it('asks a signed-out citizen to log in', async () => {
      const { calls } = mockBff({ signedIn: false });
      await renderRoute('/applications/sub-1');

      expect(await screen.findByRole('link', { name: 'Log in' }, T)).toBeInTheDocument();
      expect(screen.queryByText('Jane Citizen')).toBeNull();
      expect(calls).toEqual([]);
    });

    it('shows not available for an unknown application', async () => {
      mockBff({ initial: null });
      await renderRoute('/applications/sub-1');

      expect(
        await screen.findByRole('heading', { name: 'This application isn’t available.' }, T),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    });
  });

  describe('revise', () => {
    it('revises a needs-changes application in place and resubmits it', async () => {
      const { calls } = mockBff({
        initial: detail({
          status: 'needs_changes',
          statusLabel: 'Action needed',
          reviewReason: 'Please use your full legal name.',
        }),
      });
      await renderRoute('/applications/sub-1');

      expect(
        await screen.findByText('“Please use your full legal name.”', undefined, T),
      ).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Revise' }));

      // The revision opens HERE, seeded with the last answers, on the same form.
      const field = await screen.findByLabelText('Your name', undefined, T);
      expect(field).toHaveValue('Jane Citizen');
      await userEvent.clear(field);
      // The cleared value reaches the host after JSONForms' 10ms debounce; typing on at once races it.
      await new Promise((resolve) => setTimeout(resolve, 50));
      await userEvent.type(field, 'Jane Q. Citizen');
      // JSONForms emits after a 10ms debounce; a person can't click inside it.
      await new Promise((resolve) => setTimeout(resolve, 50));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(
        () =>
          expect(calls).toEqual([
            { method: 'POST', path: '/v1/me/applications/sub-1/revise' },
            {
              method: 'POST',
              path: '/v1/me/applications/sub-1/submit',
              body: { data: { name: 'Jane Q. Citizen' } },
            },
          ]),
        T,
      );
      // Back to the read-back, resubmitted.
      expect(await screen.findByText('Jane Q. Citizen', undefined, T)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    });
  });
});
