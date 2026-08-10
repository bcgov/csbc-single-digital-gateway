import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OverviewPage } from '@/components/console/pages/overview';
import type { ServiceSummary } from '@/lib/services';

const mockNavigate = vi.fn();
const mockParams = { slug: 'riverton' };
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  Link: ({ to, params, children, ...props }: any) => {
    let href = to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

// The New service modal has its own test suite; here we only assert the CTA toggles it open.
vi.mock('@/components/console/services/new-service-modal', () => ({
  NewServiceModal: ({ open }: any) => (open ? <div data-testid="new-service-modal" /> : null),
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
});

const service = (over: Partial<ServiceSummary>): ServiceSummary => ({
  id: 'srv-1',
  workspaceId: 'w1',
  title: 'Parking Permits',
  description: '',
  status: 'published',
  versionCount: 2,
  hasSubmissions: true,
  latestPublished: true,
  createdAt: '2026-07-15T00:00:00Z',
  updatedAt: '2026-07-15T12:30:00Z',
  ...over,
});

/** Seed the workspace-by-slug + recently-updated (limit 3) queries and render the page. */
function renderOverview(items: ServiceSummary[] = [], seedWorkspace = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  if (seedWorkspace) {
    queryClient.setQueryData(['workspaces', 'by-slug', 'riverton'], {
      id: 'w1',
      slug: 'riverton',
      name: 'Riverton',
    });
  }

  const params = { q: '', sort: 'updated', order: 'desc', limit: 3, offset: 0 };
  queryClient.setQueryData(['services', 'w1', params], {
    items,
    total: items.length,
    limit: 3,
    offset: 0,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OverviewPage />
    </QueryClientProvider>,
  );
}

describe('OverviewPage Component Test Suite', () => {
  it('renders the section headings for the redesigned layout', () => {
    renderOverview();

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recently updated' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resources' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
  });

  it('renders the two analytics placeholder cards', () => {
    renderOverview();

    expect(screen.getByText('Page Views')).toBeInTheDocument();
    expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
  });

  it('renders the Resources accordion triggers', () => {
    renderOverview();

    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Legal' })).toBeInTheDocument();
  });

  it('opens the New service modal when the Create-new-service card is clicked', async () => {
    const user = userEvent.setup();
    renderOverview();

    expect(screen.queryByTestId('new-service-modal')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create new service/i }));

    expect(await screen.findByTestId('new-service-modal')).toBeInTheDocument();
  });

  it('renders the 3 most-recently-updated services as service cards', () => {
    renderOverview([
      service({ id: 'srv-1', title: 'Parking Permits', status: 'published' }),
      service({ id: 'srv-2', title: 'Business Licensing', status: 'draft' }),
      service({ id: 'srv-3', title: 'Dog Licences', status: 'archived' }),
    ]);

    expect(screen.getByRole('link', { name: /Parking Permits/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Business Licensing/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dog Licences/ })).toBeInTheDocument();
  });

  it('shows the empty state when the workspace has no services', () => {
    renderOverview([]);

    expect(screen.getByText('No services yet — create one to get started.')).toBeInTheDocument();
  });
});
