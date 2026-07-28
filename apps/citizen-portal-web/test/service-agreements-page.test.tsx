import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { groupByMonth } from '@/components/service-agreements-page';
import type { ServiceAgreementListItem } from '@/lib/service-agreements';
import { routeTree } from '@/routeTree.gen';

const authed = { id: 'c1', roles: ['citizen'], claims: { sub: 's1' } };

const AGREEMENTS: ServiceAgreementListItem[] = [
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

interface Opts {
  me?: Response;
  list?: unknown[];
  detail?: Response;
  path?: string;
}

function renderPage({ me, list = [], detail, path = '/account/service-agreements' }: Opts) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth/me')) return me ?? jsonResponse(authed);
    if (url.includes('/v1/me/service-agreements/'))
      return detail ?? new Response(null, { status: 404 });
    if (url.includes('/v1/me/service-agreements')) return jsonResponse({ items: list });
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
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

describe('citizen-portal-web /account/service-agreements timeline', () => {
  it('renders an empty state when the citizen has approved nothing', async () => {
    renderPage({ list: [] });
    expect(
      await screen.findByRole('heading', { name: 'Service Agreements' }, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/no service agreements yet/i, {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('renders approvals grouped into month sections with link cards to the detail', async () => {
    renderPage({ list: AGREEMENTS });
    // Card titles for each approval.
    expect(
      await screen.findByText('Privacy Agreement', {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Terms of Use')).toBeInTheDocument();
    expect(screen.getByText('Data Sharing')).toBeInTheDocument();
    // Two month sections (Jan 2027 + Dec 2026) → at least two h2 headings.
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2);
    // Each card links to its detail route.
    expect(screen.getByRole('link', { name: /Privacy Agreement/i })).toHaveAttribute(
      'href',
      '/account/service-agreements/a1',
    );
  });

  it('prompts an anonymous visitor to log in', async () => {
    renderPage({ me: new Response(null, { status: 401 }) });
    const link = await screen.findByRole('link', { name: /log in/i }, { timeout: 10000 });
    expect(link).toHaveAttribute('href', expect.stringContaining('/auth/login'));
  });
});

describe('citizen-portal-web /account/service-agreements/:id detail', () => {
  it('shows the agreement name as the heading, the decision status, and read-only radios', async () => {
    renderPage({
      path: '/account/service-agreements/a1',
      detail: jsonResponse({
        id: 'a1',
        agreementDocumentId: 'd1',
        title: 'Privacy Agreement',
        description: 'Our privacy terms',
        content: null,
        decision: 'approve',
        approveLabel: 'I accept',
        rejectLabel: 'I decline',
        consentedAt: '2027-01-15T12:00:00.000Z',
      }),
    });
    // The agreement name is the page heading (h1).
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Privacy Agreement', level: 1 },
        { timeout: 10000 },
      ),
    ).toBeInTheDocument();
    // The decision + date is the subtitle status line.
    expect(screen.getByText(/approved on/i)).toBeInTheDocument();
    expect(screen.getByText('Our privacy terms')).toBeInTheDocument();
    // Read-only radios show the authored labels with the recorded decision selected.
    expect(screen.getByRole('radio', { name: 'I accept' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'I decline' })).not.toBeChecked();
    // Breadcrumb roots at the account settings page.
    expect(screen.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
      'href',
      '/account',
    );
  });

  it('shows a not-found message when the agreement 404s', async () => {
    renderPage({
      path: '/account/service-agreements/missing',
      detail: new Response(null, { status: 404 }),
    });
    expect(
      await screen.findByText(/could not be found/i, {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });
});

describe('groupByMonth', () => {
  it('groups a descending list into months then days', () => {
    const months = groupByMonth(AGREEMENTS);
    expect(months).toHaveLength(2);
    // Jan 2027: two distinct days (a1, a2); Dec 2026: one day (a3).
    expect(months[0]!.days).toHaveLength(2);
    expect(months[1]!.days).toHaveLength(1);
    expect(months[0]!.days[0]!.items[0]!.id).toBe('a1');
  });

  it('returns an empty array for no items', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
