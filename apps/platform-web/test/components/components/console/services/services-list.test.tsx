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

vi.mock('@/components/console/services/service-menu', () => ({
  ServiceMenu: () => <div data-testid="mock-service-menu">Menu</div>,
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
  mockSearchValue = { sort: 'updated', order: 'desc' };
});

const mockServices: ServiceSummary[] = [
  {
    id: 'srv-1',
    workspaceId: 'ws-1',
    title: 'Parking Permits',
    description: 'Parking Permits description',
    status: 'published',
    versionCount: 2,
    hasSubmissions: true,
    latestPublished: true,
    createdAt: '2026-07-15T00:00:00Z',
    updatedAt: '2026-07-15T00:00:00Z',
  },
  {
    id: 'srv-2',
    workspaceId: 'ws-1',
    title: 'Business Licensing',
    description: 'Business Licensing description',
    status: 'draft',
    versionCount: 1,
    hasSubmissions: false,
    latestPublished: false,
    createdAt: '2026-07-15T00:00:00Z',
    updatedAt: '2026-07-15T00:00:00Z',
  },
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

describe('ServicesList Component Test Suite', () => {
  it('disables "New service" button when workspace is loading/empty', () => {
    renderServicesList(false, []);

    const newBtn = screen.getByRole('button', { name: /new service/i });
    expect(newBtn).toBeDisabled();
    expect(
      screen.getByText('No services yet — create one with the New button.'),
    ).toBeInTheDocument();
  });

  it('renders empty list state with enabled button when workspace loaded', () => {
    renderServicesList(true, []);

    const newBtn = screen.getByRole('button', { name: /new service/i });
    expect(newBtn).not.toBeDisabled();
    expect(
      screen.getByText('No services yet — create one with the New button.'),
    ).toBeInTheDocument();
  });

  it('renders services rows with links, badges, version counts, and menus', () => {
    renderServicesList(true, mockServices);

    // Verify row links
    const link1 = screen.getByRole('link', { name: 'Parking Permits' });
    expect(link1).toBeInTheDocument();
    expect(link1.getAttribute('href')).toBe('/app/riverton/services/srv-1');

    const link2 = screen.getByRole('link', { name: 'Business Licensing' });
    expect(link2).toBeInTheDocument();
    expect(link2.getAttribute('href')).toBe('/app/riverton/services/srv-2');

    // Badges
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();

    // Version counts
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    // Menus
    expect(screen.getAllByTestId('mock-service-menu')).toHaveLength(2);
  });

  it('navigates to services new form on New Service button click', async () => {
    const user = userEvent.setup();
    renderServicesList(true, []);

    const newBtn = screen.getByRole('button', { name: /new service/i });
    await user.click(newBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/new',
      params: { slug: 'riverton' },
    });
  });

  it('renders no matches empty state when search term returns no results', () => {
    mockSearchValue = { sort: 'updated', order: 'desc', q: 'nonexistent' };
    renderServicesList(true, []);

    expect(screen.getByText('No services match “nonexistent”.')).toBeInTheDocument();
  });
});
