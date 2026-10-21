import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { routeTree } from '@/routeTree.gen';

export const PREFERENCES = {
  userId: 'c1',
  email: 'amina@example.com' as string | null,
  channels: [
    { channel: 'in_app', enabled: true },
    { channel: 'email', enabled: false },
  ],
};

export const AGREEMENTS = [
  {
    id: 'a1',
    agreementDocumentId: 'd1',
    title: 'Privacy Agreement',
    consentedAt: '2027-01-15T12:00:00.000Z',
  },
  {
    id: 'a2',
    agreementDocumentId: 'd2',
    title: 'Terms of Use',
    consentedAt: '2027-01-10T12:00:00.000Z',
  },
  {
    id: 'a3',
    agreementDocumentId: 'd3',
    title: 'Data Sharing',
    consentedAt: '2026-12-20T12:00:00.000Z',
  },
];

export type RenderPageOptions = {
  path?: string;
  list?: unknown[] | Response;
  detail?: any;
  serviceAgreements?: unknown[] | Response;
  serviceAgreementDetail?: any;
  errorOnAgreements?: boolean;
  [key: string]: any;
};

export async function renderPage(options?: RenderPageOptions) {
  const puts: string[] = [];
  const defaultPath =
    options?.list !== undefined ||
    options?.detail !== undefined ||
    options?.errorOnAgreements !== undefined ||
    options?.serviceAgreements !== undefined ||
    options?.serviceAgreementDetail !== undefined
      ? '/account/service-agreements'
      : '/account/notifications';
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [options?.path ?? defaultPath] }),
  });
  await router.load();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { puts, client, router };
}
