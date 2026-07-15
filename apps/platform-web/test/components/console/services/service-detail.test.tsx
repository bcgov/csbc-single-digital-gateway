import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServiceDetail } from '@/components/console/services/service-detail';
import { addServiceVersion, publishVersion, updateDraft } from '@/lib/services';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useBlocker: () => ({
    state: 'unblocked',
    reset: vi.fn(),
    proceed: vi.fn(),
  }),
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

vi.mock('@/lib/page-chrome', () => ({
  useSetPageChrome: vi.fn(),
}));

vi.mock('@/components/console/unsaved-changes-guard', () => ({
  UnsavedChangesGuard: () => null,
}));

vi.mock('@/components/console/services/service-editor', () => ({
  ServiceEditor: ({ data, onChange, readonly }: any) => (
    <div>
      <label htmlFor="title-input">Title</label>
      <input
        id="title-input"
        value={data.title ?? ''}
        disabled={readonly}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
      />
    </div>
  ),
}));

vi.mock('@/components/console/services/application-methods', () => ({
  ApplicationMethods: () => <div data-testid="application-methods">Methods</div>,
}));

vi.mock('@/lib/services', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/services')>();

  const mockService = {
    id: 'srv-123',
    workspaceId: 'w1',
    title: 'Municipal Permits',
    description: 'Apply for parking and zoning permits',
    createdAt: '2026-06-01T00:00:00.000Z',
  };

  const mockVersions = [
    {
      id: 'v1',
      documentId: 'srv-123',
      version: 1,
      status: 'published',
      data: { title: 'Municipal Permits V1', description: 'Apply for parking and zoning permits' },
      createdAt: '2026-06-01T00:00:00.000Z',
      publishedAt: '2026-06-02T00:00:00.000Z',
      archivedAt: null,
    },
    {
      id: 'v2',
      documentId: 'srv-123',
      version: 2,
      status: 'draft',
      data: { title: 'Municipal Permits V2', description: 'Updated description' },
      createdAt: '2026-06-03T00:00:00.000Z',
      publishedAt: null,
      archivedAt: null,
    },
  ];

  const mockServiceDetailResponse = {
    service: mockService,
    versions: mockVersions,
    definition: {
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/title' }],
      },
    },
    hasSubmissions: false,
  };

  const mockReferences = [
    {
      id: 'ref1',
      relation: 'application_form',
      position: 0,
      label: 'Standard application',
      targetDocumentId: 'doc1',
      targetVersionId: 'v-doc1',
      targetKind: 'basic-form',
      targetTitle: 'Permit Form',
      targetVersion: 1,
      targetStatus: 'draft',
      hasSubmissions: false,
      hasStructure: true,
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  ];

  return {
    ...original,
    addServiceVersion: vi.fn(),
    publishVersion: vi.fn(),
    updateDraft: vi.fn(),
    serviceQueryOptions: (id: string) => ({
      queryKey: ['services', 'detail', id],
      queryFn: () => Promise.resolve(mockServiceDetailResponse),
    }),
    serviceReferencesQueryOptions: (id: string, versionId: string) => ({
      queryKey: ['services', 'detail', id, 'references', versionId],
      queryFn: () => Promise.resolve(mockReferences),
    }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
});

const mockService = {
  id: 'srv-123',
  workspaceId: 'w1',
  title: 'Municipal Permits',
  description: 'Apply for parking and zoning permits',
  createdAt: '2026-06-01T00:00:00.000Z',
};

const mockVersions = [
  {
    id: 'v1',
    documentId: 'srv-123',
    version: 1,
    status: 'published',
    data: { title: 'Municipal Permits V1', description: 'Apply for parking and zoning permits' },
    createdAt: '2026-06-01T00:00:00.000Z',
    publishedAt: '2026-06-02T00:00:00.000Z',
    archivedAt: null,
  },
  {
    id: 'v2',
    documentId: 'srv-123',
    version: 2,
    status: 'draft',
    data: { title: 'Municipal Permits V2', description: 'Updated description' },
    createdAt: '2026-06-03T00:00:00.000Z',
    publishedAt: null,
    archivedAt: null,
  },
];

const mockServiceDetailResponse = {
  service: mockService,
  versions: mockVersions,
  definition: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', title: 'Title' },
      },
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/title' }],
    },
  },
  hasSubmissions: false,
};

const mockReferences = [
  {
    id: 'ref1',
    relation: 'application_form',
    position: 0,
    label: 'Standard application',
    targetDocumentId: 'doc1',
    targetVersionId: 'v-doc1',
    targetKind: 'basic-form',
    targetTitle: 'Permit Form',
    targetVersion: 1,
    targetStatus: 'draft',
    hasSubmissions: false,
    hasStructure: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

function renderServiceDetail(props: {
  slug?: string;
  id?: string;
  versionId?: string;
  tab?: 'details' | 'methods';
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  // Seed cache
  queryClient.setQueryData(
    ['services', 'detail', props.id ?? 'srv-123'],
    mockServiceDetailResponse,
  );
  queryClient.setQueryData(
    ['services', 'detail', props.id ?? 'srv-123', 'references', props.versionId ?? 'v2'],
    mockReferences,
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <ServiceDetail
        slug={props.slug ?? 'riverton'}
        id={props.id ?? 'srv-123'}
        versionId={props.versionId ?? 'v2'}
        tab={props.tab ?? 'details'}
      />
    </QueryClientProvider>,
  );
}

describe('ServiceDetail', () => {
  it('renders details in edit mode for a draft version', async () => {
    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    // Tabs should be present
    expect(screen.getByRole('tab', { name: /service details/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /application methods/i })).toBeInTheDocument();

    // Editor should load mock data
    const titleInput = await screen.findByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('Municipal Permits V2');

    // Action buttons
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish service/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit service details/i })).not.toBeInTheDocument();
  });

  it('renders read-only details for a published version', async () => {
    renderServiceDetail({ versionId: 'v1', tab: 'details' });

    const titleInput = await screen.findByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('Municipal Permits V1');
    expect(titleInput).toBeDisabled();

    // Save and publish should be hidden
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publish service/i })).not.toBeInTheDocument();

    // "Go to current" since v1 is old (v2 is latest)
    expect(screen.getByRole('button', { name: /go to current/i })).toBeInTheDocument();
  });

  it('navigates to latest version when "Go to current" is clicked', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v1', tab: 'details' });

    const goToCurrentBtn = screen.getByRole('button', { name: /go to current/i });
    await user.click(goToCurrentBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id',
      params: { slug: 'riverton', id: 'srv-123' },
    });
  });

  it('handles editing and saving the draft details', async () => {
    const user = userEvent.setup();
    vi.mocked(updateDraft).mockResolvedValueOnce({} as any);

    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const titleInput = await screen.findByLabelText(/title/i);
    const saveBtn = screen.getByRole('button', { name: /save draft/i });

    // Save draft is disabled because form is not dirty
    expect(saveBtn).toBeDisabled();

    // Type something to make it dirty
    await user.clear(titleInput);
    await user.type(titleInput, 'New Title Input');

    expect(saveBtn).not.toBeDisabled();
    await user.click(saveBtn);
    await waitFor(() => {
      expect(updateDraft).toHaveBeenCalledWith('srv-123', 'v2', {
        data: expect.objectContaining({ title: 'New Title Input' }),
        title: 'New Title Input',
      });
    });
  });

  it('handles publishing the draft version', async () => {
    const user = userEvent.setup();
    vi.mocked(publishVersion).mockResolvedValueOnce({} as any);

    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const publishBtn = screen.getByRole('button', { name: /publish service/i });
    await user.click(publishBtn);

    // Dialog should be open
    const dialogTitle = await screen.findByRole('heading', { name: /publish service/i });
    expect(dialogTitle).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^publish$/i });
    await user.click(confirmBtn);

    expect(publishVersion).toHaveBeenCalledWith('srv-123', 'v2');
  });

  it('handles creating a new draft from latest published version', async () => {
    const user = userEvent.setup();
    vi.mocked(addServiceVersion).mockResolvedValueOnce({} as any);

    // Seed query where the only version is published (so it's latest and published)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    const mockSinglePublishedDetail = {
      ...mockServiceDetailResponse,
      versions: [mockVersions[0]], // only v1
    };

    const renderWithSinglePublished = () => {
      queryClient.setQueryData(['services', 'detail', 'srv-123'], mockSinglePublishedDetail);
      queryClient.setQueryData(
        ['services', 'detail', 'srv-123', 'references', 'v1'],
        mockReferences,
      );

      return render(
        <QueryClientProvider client={queryClient}>
          <ServiceDetail slug="riverton" id="srv-123" versionId="v1" tab="details" />
        </QueryClientProvider>,
      );
    };

    renderWithSinglePublished();

    const editBtn = await screen.findByRole('button', { name: /edit service details/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(addServiceVersion).toHaveBeenCalledWith('srv-123');
    });
  });

  it('navigates to methods URL when switching to methods tab', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const methodsTab = screen.getByRole('tab', { name: /application methods/i });
    await user.click(methodsTab);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/application-methods',
      params: { slug: 'riverton', id: 'srv-123' },
    });
  });
});
