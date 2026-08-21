import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceDetail, ServiceVersion } from '@/lib/services';

const { navigateMock, queryRef, updateDraftMock, invalidateMock, mutateRef } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  queryRef: {
    current: { data: undefined, isPending: false, isError: false } as {
      data: unknown;
      isPending: boolean;
      isError: boolean;
    },
  },
  updateDraftMock: vi.fn(),
  invalidateMock: vi.fn(),
  mutateRef: { current: null as null | ((data: Record<string, unknown>) => void) },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => queryRef.current,
  queryOptions: (options: unknown) => options,
  useQueryClient: () => ({ invalidateQueries: invalidateMock }),
  useMutation: ({
    mutationFn,
    onSuccess,
  }: {
    mutationFn: (d: Record<string, unknown>) => Promise<unknown>;
    onSuccess: () => Promise<void> | void;
  }) => {
    mutateRef.current = async (d) => {
      await mutationFn(d);
      await onSuccess();
    };
    return { mutate: mutateRef.current, isPending: false, isError: false, error: null };
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({
    slug: 'riverton',
    id: 'svc-1',
    versionId: 'ver-2',
    sectionId: 'service-description',
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('@/lib/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services')>()),
  updateDraft: updateDraftMock,
}));

// FormRunner pulls JSONForms + Lexical; its behaviour is covered in @repo/react. Stand in a stub
// that exposes the schema it was handed and a Save that emits the merged data.
vi.mock('@repo/react/form-runner', () => ({
  FormRunner: ({
    definition,
    data,
    onSubmit,
  }: {
    definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
    data: Record<string, unknown>;
    onSubmit?: (d: Record<string, unknown>) => void;
  }) => (
    <div>
      <span data-testid="scoped-required">
        {JSON.stringify((definition.schema as { required?: unknown }).required ?? [])}
      </span>
      <span data-testid="runner-uischema">{JSON.stringify(definition.uischema)}</span>
      <button type="button" onClick={() => onSubmit?.({ ...data, summary: 'edited' })}>
        Save
      </button>
    </div>
  ),
}));

import { SectionEditDialog } from '@/components/console/services/section-edit/section-edit-dialog';

const UISCHEMA = {
  type: 'VerticalLayout',
  elements: [
    {
      type: 'Group',
      label: 'Service description',
      options: { edit: true },
      elements: [{ type: 'Control', scope: '#/properties/summary' }],
    },
    {
      type: 'Group',
      label: 'Application methods',
      options: { edit: { editor: 'application-methods' } },
      elements: [],
    },
  ],
};

const SCHEMA = {
  type: 'object',
  required: ['summary', 'eligibility'],
  properties: { summary: { type: 'string' }, eligibility: { type: 'string' } },
};

const version = (over: Partial<ServiceVersion> = {}): ServiceVersion => ({
  id: 'ver-2',
  documentId: 'svc-1',
  typeVersionId: 'tv-1',
  version: 2,
  status: 'draft',
  data: { summary: 'before', eligibility: 'keep me' },
  createdAt: '2026-08-01T00:00:00Z',
  publishedAt: null,
  archivedAt: null,
  ...over,
});

const detail = (over: Partial<ServiceVersion> = {}): ServiceDetail => ({
  service: {
    id: 'svc-1',
    workspaceId: 'ws-1',
    title: 'Permit',
    description: '',
    createdAt: '',
    updatedAt: '',
  },
  versions: [version(over)],
  definition: { schema: SCHEMA, uischema: UISCHEMA },
  definitions: { 'tv-1': { schema: SCHEMA, uischema: UISCHEMA } },
  hasSubmissions: false,
});

beforeEach(() => {
  vi.clearAllMocks();
  queryRef.current = { data: detail(), isPending: false, isError: false };
  updateDraftMock.mockResolvedValue(version());
});

describe('SectionEditDialog', () => {
  it('titles the window with the section label', async () => {
    render(<SectionEditDialog />);
    expect(await screen.findByText('Service description')).toBeInTheDocument();
  });

  it('scopes required to the section so another section cannot block Save', async () => {
    render(<SectionEditDialog />);
    // `eligibility` is required by the service schema but lives outside this section.
    expect(JSON.parse((await screen.findByTestId('scoped-required')).textContent ?? '')).toEqual([
      'summary',
    ]);
  });

  it("hands FormRunner the group's CHILDREN, not the group (no repeated heading)", async () => {
    render(<SectionEditDialog />);
    const uischema = JSON.parse((await screen.findByTestId('runner-uischema')).textContent ?? '');
    expect(uischema.elements).toEqual([{ type: 'Control', scope: '#/properties/summary' }]);
  });

  it('saves the whole merged data object so other sections survive', async () => {
    render(<SectionEditDialog />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(updateDraftMock).toHaveBeenCalledWith('svc-1', 'ver-2', {
      data: { summary: 'edited', eligibility: 'keep me' },
    });
    expect(invalidateMock).toHaveBeenCalledWith({ queryKey: ['services'] });
  });

  it('navigates back to the section anchor after a save', async () => {
    render(<SectionEditDialog />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/versions/$versionId/details',
      params: { slug: 'riverton', id: 'svc-1', versionId: 'ver-2' },
      hash: 'service-description',
    });
  });

  it('refuses to edit a non-draft version', async () => {
    queryRef.current = {
      data: detail({ status: 'published' }),
      isPending: false,
      isError: false,
    };
    render(<SectionEditDialog />);
    expect(await screen.findByText(/Only draft versions can be edited/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('explains a section the definition no longer carries', async () => {
    const stale = detail();
    stale.definitions['tv-1'] = {
      schema: SCHEMA,
      uischema: { type: 'VerticalLayout', elements: [] },
    };
    queryRef.current = { data: stale, isPending: false, isError: false };
    render(<SectionEditDialog />);
    expect(await screen.findByText(/no longer part of the service definition/)).toBeInTheDocument();
  });

  it('surfaces an unregistered editor key instead of a blank window', async () => {
    const named = detail();
    const uischema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Group',
          label: 'Service description',
          options: { edit: { editor: 'nope' } },
          elements: [],
        },
      ],
    };
    named.definitions['tv-1'] = { schema: SCHEMA, uischema };
    queryRef.current = { data: named, isPending: false, isError: false };
    render(<SectionEditDialog />);
    expect(await screen.findByText(/No editor is registered for/)).toBeInTheDocument();
  });

  it('reports a failed load', async () => {
    queryRef.current = { data: undefined, isPending: false, isError: true };
    render(<SectionEditDialog />);
    expect(await screen.findByText(/couldn’t be loaded/)).toBeInTheDocument();
  });
});
