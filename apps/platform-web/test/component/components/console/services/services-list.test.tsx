import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesList } from '@/components/console/services/services-list';
import type { ServiceSummary } from '@/lib/services';

let mockSearchValue: any = { sort: 'updated', order: 'desc' };
const mockNavigate = vi.fn();
const mockParams = { slug: 'riverton' };
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearch: () => mockSearchValue,
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

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
  mockSearchValue = { sort: 'updated', order: 'desc' };
});

const service = (over: Partial<ServiceSummary>): ServiceSummary => ({
  id: 'srv-1',
  workspaceId: 'ws-1',
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

const mockServices: ServiceSummary[] = [
  service({ id: 'srv-1', title: 'Parking Permits', status: 'published' }),
  service({ id: 'srv-2', title: 'Business Licensing', status: 'draft' }),
  service({ id: 'srv-3', title: 'Old Program', status: 'archived' }),
];

function renderServicesList(seedWorkspace = true, items: ServiceSummary[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });

  if (seedWorkspace) {
    queryClient.setQueryData(['workspaces', 'by-slug', 'riverton'], {
      id: 'w1',
      slug: 'riverton',
      name: 'Riverton',
    });
  }

  const params = { q: '', sort: 'updated', order: 'desc', limit: 20, offset: 0 };
  queryClient.setQueryData(['services', 'w1', params], {
    items,
    total: items.length,
    limit: 20,
    offset: 0,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ServicesList />
    </QueryClientProvider>,
  );
}

/** The card element inside a service's link. */
const cardOf = (name: RegExp) =>
  screen.getByRole('link', { name }).querySelector('[data-slot="card"]');

describe('ServicesList Component Test Suite', () => {
  it('disables the New button and shows the empty state when workspace is loading/empty', () => {
    renderServicesList(false, []);

    expect(screen.getByRole('button', { name: /^new$/i })).toBeDisabled();
    expect(
      screen.getByText('No services yet — create one with the New button.'),
    ).toBeInTheDocument();
  });

  it('enables the New button with an empty list when the workspace is loaded', () => {
    renderServicesList(true, []);

    expect(screen.getByRole('button', { name: /^new$/i })).not.toBeDisabled();
    expect(
      screen.getByText('No services yet — create one with the New button.'),
    ).toBeInTheDocument();
  });

  it('renders each service as a status-bordered card link with a badge and last-updated line', () => {
    renderServicesList(true, mockServices);

    // Full-card links to the service detail.
    expect(screen.getByRole('link', { name: /parking permits/i })).toHaveAttribute(
      'href',
      '/app/riverton/services/srv-1',
    );
    expect(screen.getByRole('link', { name: /business licensing/i })).toHaveAttribute(
      'href',
      '/app/riverton/services/srv-2',
    );
    expect(screen.getByRole('link', { name: /old program/i })).toHaveAttribute(
      'href',
      '/app/riverton/services/srv-3',
    );

    // Status badges.
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();

    // Status-colored left border.
    expect(cardOf(/parking permits/i)).toHaveClass('border-l-success-border');
    expect(cardOf(/business licensing/i)).toHaveClass('border-l-border');
    expect(cardOf(/old program/i)).toHaveClass('border-l-danger-border');

    // One "Last updated:" line per service (exact time is timezone-dependent — match the label).
    expect(screen.getAllByText(/Last updated:/)).toHaveLength(3);

    // No table, no per-row actions menu.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
  });

  it('navigates to the new-service form when the New button is clicked', async () => {
    const user = userEvent.setup();
    renderServicesList(true, []);

    await user.click(screen.getByRole('button', { name: /^new$/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/new',
      params: { slug: 'riverton' },
    });
  });
});
