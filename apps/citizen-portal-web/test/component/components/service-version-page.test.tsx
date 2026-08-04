import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServiceVersionPage } from '@/components/service-version-page';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

// Mock UI elements from @repo
vi.mock('@repo/ui/badge', () => ({
  Badge: ({ children, color, className }: any) => (
    <span data-testid="badge" data-color={color} className={className}>
      {children}
    </span>
  ),
}));

vi.mock('@repo/ui/button', () => ({
  Button: ({ children, className, render: renderProp }: any) => {
    if (renderProp) {
      return React.cloneElement(renderProp, {
        children: (
          <>
            {renderProp.props.children}
            {children}
          </>
        ),
      });
    }
    return (
      <button data-testid="button" className={className}>
        {children}
      </button>
    );
  },
}));

vi.mock('@repo/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  History: () => <span data-testid="history-icon" />,
}));

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(),
  Link: ({ children, to, params }: any) => {
    const url = to.replace('$serviceId', params?.serviceId || '');
    return <a href={url}>{children}</a>;
  },
}));

// Mock custom components
vi.mock('@/components/layout/citizen-shell', () => ({
  CitizenShell: ({ children, activeNav }: any) => (
    <div data-testid="citizen-shell" data-active-nav={activeNav}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/services/detail-sections', () => ({
  ServiceSections: ({ serviceId, schema, uischema, data, applications }: any) => (
    <div
      data-testid="service-sections"
      data-service-id={serviceId}
      data-schema={JSON.stringify(schema)}
      data-uischema={JSON.stringify(uischema)}
      data-data={JSON.stringify(data)}
      data-apps-count={applications.length}
    />
  ),
}));

vi.mock('@/components/services/service-content', () => ({
  Breadcrumb: ({ trail }: any) => (
    <nav data-testid="breadcrumb" data-trail={JSON.stringify(trail)} />
  ),
}));

// Mock catalog query options
vi.mock('@/lib/catalog', () => ({
  serviceQueryOptions: vi.fn((id) => ({ queryKey: ['service', id] })),
  serviceVersionQueryOptions: vi.fn((sId, vId) => ({ queryKey: ['version', sId, vId] })),
}));

// Mock useQuery hook
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('ServiceVersionPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useParams).mockReturnValue({
      serviceId: 'svc-abc',
      versionId: 'ver-123',
    });
  });

  it('renders loading state when version or service query is pending', () => {
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'version') {
        return { isPending: true } as any;
      }
      return { isPending: false } as any;
    });

    render(<ServiceVersionPage />);

    expect(screen.getByTestId('citizen-shell')).toHaveAttribute('data-active-nav', 'services');
    expect(screen.getAllByTestId('skeleton').length).toBe(2);
    expect(screen.queryByTestId('service-sections')).not.toBeInTheDocument();
  });

  it('renders "Version not available" state on error or missing version data', () => {
    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'version') {
        return { isPending: false, isError: true, data: null } as any;
      }
      return { isPending: false, data: {} } as any;
    });

    render(<ServiceVersionPage />);

    expect(screen.getByText('Version not available')).toBeInTheDocument();
    expect(screen.getByText('This version doesn’t exist or isn’t published.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Back to the service/i });
    expect(link).toHaveAttribute('href', '/services/svc-abc');
  });

  it('renders historical version detail with validity range details and sections', () => {
    const mockVersionData = {
      version: 2,
      title: 'Historical Title',
      status: 'archived',
      createdAt: '2026-01-01T00:00:00.000Z',
      publishedAt: '2026-01-10T00:00:00.000Z',
      archivedAt: '2026-02-01T00:00:00.000Z',
      schema: { type: 'object' },
      uischema: { type: 'VerticalLayout' },
      data: { description: 'Historical description detail text' },
    };

    const mockServiceData = {
      applications: [{ id: 'app1', label: 'Apply' }],
    };

    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'version') {
        return { isPending: false, data: mockVersionData } as any;
      }
      if (options.queryKey[0] === 'service') {
        return { isPending: false, data: mockServiceData } as any;
      }
      return { isPending: false } as any;
    });

    render(<ServiceVersionPage />);

    // Verify Breadcrumb
    const breadcrumb = screen.getByTestId('breadcrumb');
    const trail = JSON.parse(breadcrumb.getAttribute('data-trail') || '[]');
    expect(trail).toEqual([
      { label: 'Services', href: '/services' },
      { label: 'Historical Title', href: '/services/svc-abc' },
      { label: 'Version 2' },
    ]);

    // Verify Title and Badge
    expect(screen.getByRole('heading', { level: 1, name: 'Historical Title' })).toBeInTheDocument();
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('archived');

    // Verify Description
    expect(screen.getByText('Historical description detail text')).toBeInTheDocument();

    // Verify validityRange formatting: Published and Archived
    const expectedFrom = new Date(mockVersionData.publishedAt).toLocaleDateString();
    const expectedTo = new Date(mockVersionData.archivedAt).toLocaleDateString();
    expect(
      screen.getByText(new RegExp(`version 2.*Valid ${expectedFrom} – ${expectedTo}`, 'i')),
    ).toBeInTheDocument();

    // Link to current service
    const link = screen.getByRole('link', { name: /View the current service/i });
    expect(link).toHaveAttribute('href', '/services/svc-abc');

    // Verify ServiceSections render props
    const sections = screen.getByTestId('service-sections');
    expect(sections).toHaveAttribute('data-service-id', 'svc-abc');
    expect(sections).toHaveAttribute('data-schema', JSON.stringify(mockVersionData.schema));
    expect(sections).toHaveAttribute('data-uischema', JSON.stringify(mockVersionData.uischema));
    expect(sections).toHaveAttribute('data-data', JSON.stringify(mockVersionData.data));
    expect(sections).toHaveAttribute('data-apps-count', '1');
  });

  it('correctly falls back in validity range formatting when publishedAt is null', () => {
    const mockVersionData = {
      version: 1,
      title: 'Historical Title',
      status: 'archived',
      createdAt: '2026-01-01T00:00:00.000Z',
      publishedAt: null,
      archivedAt: null,
      schema: {},
      uischema: {},
      data: {},
    };

    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'version') {
        return { isPending: false, data: mockVersionData } as any;
      }
      return { isPending: false, data: { applications: [] } } as any;
    });

    render(<ServiceVersionPage />);

    // Since publishedAt is null, it should use createdAt for the "from" date
    const expectedFrom = new Date(mockVersionData.createdAt).toLocaleDateString();
    expect(
      screen.getByText(new RegExp(`version 1.*Valid from ${expectedFrom}`, 'i')),
    ).toBeInTheDocument();
  });

  it('returns empty string for validity range when both publishedAt and createdAt are null', () => {
    const mockVersionData = {
      version: 3,
      title: 'Historical Title',
      status: 'archived',
      createdAt: null,
      publishedAt: null,
      archivedAt: null,
      schema: {},
      uischema: {},
      data: {},
    };

    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === 'version') {
        return { isPending: false, data: mockVersionData } as any;
      }
      return { isPending: false, data: {} } as any;
    });

    render(<ServiceVersionPage />);

    expect(
      screen.getByText((content) => content.includes('version 3') && !content.includes('Valid')),
    ).toBeInTheDocument();
  });
});
