import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let capturedAddFn: any = null;
let capturedSaveFn: any = null;
let capturedPublishFn: any = null;
let mockState: any = null;
export let mockReferencesOverride: any = null;

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...original,
    useMutation: (options: any) => {
      if (options?.mutationFn) {
        if (!capturedAddFn) {
          capturedAddFn = options.mutationFn;
        } else if (!capturedSaveFn) {
          capturedSaveFn = options.mutationFn;
        } else if (!capturedPublishFn) {
          capturedPublishFn = options.mutationFn;
        }
      }
      return original.useMutation(options);
    },
  };
});

vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  return {
    ...original,
    useState: (initialValue: any) => {
      const [val, setVal] = original.useState(initialValue);
      if (mockState !== null && typeof initialValue === 'object' && !Array.isArray(initialValue)) {
        return [mockState, setVal];
      }
      return [val, setVal];
    },
  };
});

import { ServiceDetail } from '@/components/console/services/service-detail';
import {
  addServiceVersion,
  publishVersion,
  updateDraft,
  discardServiceVersion,
  deleteService,
  archiveService,
} from '@/lib/services';

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

export let capturedApplicationMethodsProps: any = null;

vi.mock('@/components/console/services/application-methods', () => ({
  ApplicationMethods: (props: any) => {
    capturedApplicationMethodsProps = props;
    return <div data-testid="application-methods">Methods</div>;
  },
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
    discardServiceVersion: vi.fn(),
    deleteService: vi.fn(),
    archiveService: vi.fn(),
    reactivateService: vi.fn(),
    serviceQueryOptions: (id: string) => ({
      queryKey: ['services', 'detail', id],
      queryFn: () => Promise.resolve(mockServiceDetailResponse),
    }),
    serviceReferencesQueryOptions: (id: string, versionId: string) => ({
      queryKey: ['services', 'detail', id, 'references', versionId],
      queryFn: () => Promise.resolve(mockReferencesOverride ?? mockReferences),
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
  capturedAddFn = null;
  capturedSaveFn = null;
  capturedPublishFn = null;
  mockState = null;
  mockReferencesOverride = null;
  capturedApplicationMethodsProps = null;
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
  {
    id: 'ref-external',
    relation: 'external_application',
    position: 1,
    label: 'External site',
    targetDocumentId: 'doc-external',
    targetVersionId: 'v-external',
    targetKind: 'external-application',
    targetTitle: 'External Apply',
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

describe('ServiceDetail Component Test Suite', () => {
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
    expect(screen.queryByRole('button', { name: /new version/i })).not.toBeInTheDocument();
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
      expect(updateDraft).toHaveBeenCalledWith(
        'srv-123',
        'v2',
        expect.objectContaining({
          data: expect.objectContaining({ title: 'New Title Input' }),
          title: 'New Title Input',
        }),
      );
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

    const editBtn = await screen.findByRole('button', { name: /new version/i });
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

  it('defaults to latest version when versionId is undefined', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    queryClient.setQueryData(['services', 'detail', 'srv-123'], mockServiceDetailResponse);
    queryClient.setQueryData(['services', 'detail', 'srv-123', 'references', 'v2'], mockReferences);

    render(
      <QueryClientProvider client={queryClient}>
        <ServiceDetail slug="riverton" id="srv-123" tab="details" />
      </QueryClientProvider>,
    );

    const titleInput = await screen.findByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput).toHaveValue('Municipal Permits V2');
  });

  it('renders nothing when service query is loading or data is missing', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ServiceDetail slug="riverton" id="srv-123" versionId="v2" tab="details" />
      </QueryClientProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders non-existent version error message', () => {
    renderServiceDetail({ versionId: 'v999', tab: 'details' });

    expect(screen.getByText('This version no longer exists.')).toBeInTheDocument();
  });

  it('displays validation error when saving draft with empty title', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const titleInput = await screen.findByLabelText(/title/i);
    const saveBtn = screen.getByRole('button', { name: /save draft/i });

    await user.clear(titleInput);
    await user.type(titleInput, '   ');

    expect(saveBtn).not.toBeDisabled();
    await user.click(saveBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('A service title is required');
    expect(updateDraft).not.toHaveBeenCalled();
  });

  it('handles selecting a version and switching tabs on older versions', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const pickerTrigger = screen.getByRole('button', { name: /version v2/i });
    await user.click(pickerTrigger);

    const v1Item = await screen.findByRole('menuitem', { name: /v1/i });
    await user.click(v1Item);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/versions/$versionId',
      params: { slug: 'riverton', id: 'srv-123', versionId: 'v1' },
    });

    mockNavigate.mockClear();

    cleanup();
    renderServiceDetail({ versionId: 'v1', tab: 'details' });

    const methodsTab = screen.getByRole('tab', { name: /application methods/i });
    await user.click(methodsTab);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/versions/$versionId/application-methods',
      params: { slug: 'riverton', id: 'srv-123', versionId: 'v1' },
    });
  });

  it('handles clicking Go to current button on an older version', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v1', tab: 'details' });

    const goToCurrentBtn = await screen.findByRole('button', { name: /go to current/i });
    await user.click(goToCurrentBtn);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id',
      params: { slug: 'riverton', id: 'srv-123' },
    });
  });

  it('handles tab switching from methods to details on latest version', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v2', tab: 'methods' });

    const detailsTab = screen.getByRole('tab', { name: /service details/i });
    await user.click(detailsTab);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id',
      params: { slug: 'riverton', id: 'srv-123' },
    });
  });

  it('invalidates cache and navigates on successful version creation', async () => {
    const user = userEvent.setup();
    vi.mocked(addServiceVersion).mockResolvedValueOnce({
      id: 'v3',
      version: 3,
      status: 'draft',
    } as any);
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');

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

    queryClient.setQueryData(['services', 'detail', 'srv-123'], mockSinglePublishedDetail);
    queryClient.setQueryData(['services', 'detail', 'srv-123', 'references', 'v1'], mockReferences);

    render(
      <QueryClientProvider client={queryClient}>
        <ServiceDetail slug="riverton" id="srv-123" versionId="v1" tab="details" />
      </QueryClientProvider>,
    );

    const editBtn = await screen.findByRole('button', { name: /new version/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['services'] });
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/app/$slug/services/$id',
        params: { slug: 'riverton', id: 'srv-123' },
      });
    });
  });

  it('handles discarding the draft version', async () => {
    const user = userEvent.setup();
    vi.mocked(discardServiceVersion).mockResolvedValueOnce({} as any);

    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const menuBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuBtn);

    const discardItem = await screen.findByRole('menuitem', { name: /discard draft/i });
    await user.click(discardItem);

    expect(screen.getByRole('heading', { name: /discard this draft\?/i })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^discard draft$/i });
    await user.click(confirmBtn);

    expect(discardServiceVersion).toHaveBeenCalledWith('srv-123', 'v2');
  });

  it('handles archiving the service', async () => {
    const user = userEvent.setup();
    vi.mocked(archiveService).mockResolvedValueOnce({} as any);

    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const menuBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuBtn);

    const archiveItem = await screen.findByRole('menuitem', { name: /archive service/i });
    await user.click(archiveItem);

    expect(archiveService).toHaveBeenCalledWith('srv-123');
  });

  it('handles deleting the service', async () => {
    const user = userEvent.setup();
    vi.mocked(deleteService).mockResolvedValueOnce({} as any);

    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const menuBtn = screen.getByRole('button', { name: /more actions/i });
    await user.click(menuBtn);

    const deleteItem = await screen.findByRole('menuitem', { name: /delete service/i });
    await user.click(deleteItem);

    expect(screen.getByRole('heading', { name: /delete this service\?/i })).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmBtn);

    expect(deleteService).toHaveBeenCalledWith('srv-123');
  });

  it('throws an error if no version is selected during save or publish mutations', () => {
    capturedAddFn = null;
    capturedSaveFn = null;
    capturedPublishFn = null;
    mockState = { title: 'Municipal Permits V2' };

    renderServiceDetail({ versionId: 'non-existent', tab: 'details' });

    expect(capturedSaveFn).toBeDefined();
    expect(capturedPublishFn).toBeDefined();

    expect(() => capturedSaveFn()).toThrow('No version selected');
    expect(() => capturedPublishFn()).toThrow('No version selected');
  });

  it('does not render ServiceEditor or ApplicationMethods when references query is not successful', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    queryClient.setQueryData(['services', 'detail', 'srv-123'], mockServiceDetailResponse);

    render(
      <QueryClientProvider client={queryClient}>
        <ServiceDetail slug="riverton" id="srv-123" versionId="v2" tab="details" />
      </QueryClientProvider>,
    );

    // References query is loading/failed, so referencesQuery.isSuccess is false
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
  });

  it('handles save mutation when title is missing or not a string', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const customResponse = {
      ...mockServiceDetailResponse,
      versions: [
        {
          id: 'v2',
          documentId: 'srv-123',
          version: 2,
          status: 'draft',
          data: { description: 'No title here' },
          createdAt: '2026-06-03T00:00:00.000Z',
          publishedAt: null,
          archivedAt: null,
        },
      ],
    };

    queryClient.setQueryData(['services', 'detail', 'srv-123'], customResponse);
    queryClient.setQueryData(['services', 'detail', 'srv-123', 'references', 'v2'], mockReferences);

    render(
      <QueryClientProvider client={queryClient}>
        <ServiceDetail slug="riverton" id="srv-123" versionId="v2" tab="details" />
      </QueryClientProvider>,
    );

    await screen.findByRole('button', { name: /save draft/i });

    // Calling the captured save mutation directly triggers validation
    expect(() => capturedSaveFn()).toThrow('A service title is required');
  });

  it('navigates to agreements URL when switching to agreements tab on latest version', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v2', tab: 'details' });

    const agreementsTab = screen.getByRole('tab', { name: /service agreements/i });
    await user.click(agreementsTab);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/service-agreements',
      params: { slug: 'riverton', id: 'srv-123' },
    });
  });

  it('navigates to agreements URL when switching to agreements tab on older version', async () => {
    const user = userEvent.setup();
    renderServiceDetail({ versionId: 'v1', tab: 'details' });

    const agreementsTab = screen.getByRole('tab', { name: /service agreements/i });
    await user.click(agreementsTab);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/versions/$versionId/service-agreements',
      params: { slug: 'riverton', id: 'srv-123', versionId: 'v1' },
    });
  });

  it('handles sorting when some references are not in methodOrder', async () => {
    const mockRef1: any = {
      id: 'ref-1',
      relation: 'application_form',
      position: 0,
      label: 'Ref 1',
      url: null,
      targetDocumentId: 'doc-1',
      targetVersionId: 'v-1',
      targetKind: 'basic-form',
      targetTitle: 'Form 1',
      targetVersion: 1,
      targetStatus: 'draft',
      hasSubmissions: false,
      hasStructure: true,
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    mockReferencesOverride = [mockRef1];

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    queryClient.setQueryData(['services', 'detail', 'srv-123'], mockServiceDetailResponse);
    queryClient.setQueryData(['services', 'detail', 'srv-123', 'references', 'v2'], [mockRef1]);
    queryClient.setQueryData(['services', 'detail', 'srv-123', 'agreements', 'v2'], []);

    render(
      <QueryClientProvider client={queryClient}>
        <ServiceDetail slug="riverton" id="srv-123" versionId="v2" tab="methods" />
      </QueryClientProvider>,
    );

    await screen.findByTestId('application-methods');
    expect(capturedApplicationMethodsProps.references).toHaveLength(1);
    expect(capturedApplicationMethodsProps.references[0].id).toBe('ref-1');

    const mockRef2: any = {
      id: 'ref-2',
      relation: 'application_form',
      position: 1,
      label: 'Ref 2',
      url: null,
      targetDocumentId: 'doc-2',
      targetVersionId: 'v-1',
      targetKind: 'basic-form',
      targetTitle: 'Form 2',
      targetVersion: 1,
      targetStatus: 'draft',
      hasSubmissions: false,
      hasStructure: true,
      createdAt: '2026-06-01T00:00:00.000Z',
    };

    act(() => {
      mockReferencesOverride = [mockRef1, mockRef2];
      queryClient.setQueryData(
        ['services', 'detail', 'srv-123', 'references', 'v2'],
        [mockRef1, mockRef2],
      );
    });

    await waitFor(() => {
      expect(capturedApplicationMethodsProps.references).toHaveLength(2);
    });
    expect(capturedApplicationMethodsProps.references[0].id).toBe('ref-1');
    expect(capturedApplicationMethodsProps.references[1].id).toBe('ref-2');
  });
});
