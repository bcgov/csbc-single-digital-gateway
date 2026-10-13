import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
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

function mockBff(methodResponse: () => Response) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/application-methods/')) return methodResponse();
    if (/\/v1\/services\/[^/?]+$/.test(url)) return json(service);
    if (url.includes('/auth/me')) return new Response(null, { status: 401 });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
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
      // Rule 10: no submission yet.
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
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
