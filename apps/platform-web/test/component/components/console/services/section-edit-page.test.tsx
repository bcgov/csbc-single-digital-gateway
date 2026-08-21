import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { PageChrome } from '@/lib/page-chrome';
import type { ServiceDetail, ServiceVersion } from '@/lib/services';

const { navigateMock, queryRef, updateDraftMock, invalidateMock, paramsRef, chromeRef } =
  vi.hoisted(() => ({
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
    paramsRef: {
      current: {
        slug: 'riverton',
        id: 'svc-1',
        versionId: 'ver-2',
        sectionId: 'service-description',
      } as Record<string, string | undefined>,
    },
    chromeRef: { current: null as PageChrome | null },
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
    const mutate = async (d: Record<string, unknown>) => {
      await mutationFn(d);
      await onSuccess();
    };
    return { mutate, mutateAsync: mutate, isPending: false, isError: false, error: null };
  },
}));

// The page reads params LOOSELY (`strict: false`) because two routes with different param shapes
// render it — `versionId` is simply absent on the canonical one.
vi.mock('@tanstack/react-router', () => ({
  useParams: () => paramsRef.current,
  useNavigate: () => navigateMock,
  Link: ({ children }: { children?: ReactNode }) => <a href="/stub">{children}</a>,
}));

// Capture the chrome the page registers — the breadcrumb bar is app-level, so this is the only way
// to assert what a sidebar-free page puts at the top.
vi.mock('@/lib/page-chrome', () => ({
  useSetPageChrome: (chrome: PageChrome) => {
    chromeRef.current = chrome;
  },
}));

vi.mock('@/lib/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services')>()),
  updateDraft: updateDraftMock,
}));

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

import { SectionEditPage } from '@/components/console/services/section-edit/section-edit-page';

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
  paramsRef.current = {
    slug: 'riverton',
    id: 'svc-1',
    versionId: 'ver-2',
    sectionId: 'service-description',
  };
  chromeRef.current = null;
  updateDraftMock.mockResolvedValue(version());
});

describe('SectionEditPage', () => {
  it('renders as a page, not a dialog', async () => {
    render(<SectionEditPage />);

    // The section name lives in the breadcrumb, not a page heading — the editor owns the whole area.
    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('puts a breadcrumb at the top through the app-level chrome', () => {
    render(<SectionEditPage />);

    expect(chromeRef.current?.breadcrumb).toBeTruthy();
    expect(chromeRef.current?.title).toBe('Service description');
  });

  it('still registers a breadcrumb when the section cannot be resolved (the only way back)', () => {
    queryRef.current = { data: undefined, isPending: false, isError: true };
    render(<SectionEditPage />);

    expect(chromeRef.current?.breadcrumb).toBeTruthy();
  });

  it('scopes required to the section so another section cannot block Save', async () => {
    render(<SectionEditPage />);
    // `eligibility` is required by the service schema but lives outside this section.
    expect(JSON.parse((await screen.findByTestId('scoped-required')).textContent ?? '')).toEqual([
      'summary',
    ]);
  });

  it("hands FormRunner the group's CHILDREN, not the group (no repeated heading)", async () => {
    render(<SectionEditPage />);
    const uischema = JSON.parse((await screen.findByTestId('runner-uischema')).textContent ?? '');

    expect(uischema.elements).toEqual([{ type: 'Control', scope: '#/properties/summary' }]);
  });

  it('saves the whole merged data object so other sections survive', async () => {
    render(<SectionEditPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(updateDraftMock).toHaveBeenCalledWith('svc-1', 'ver-2', {
      data: { summary: 'edited', eligibility: 'keep me' },
    });
    expect(invalidateMock).toHaveBeenCalledWith({ queryKey: ['services'] });
  });

  it('navigates back to the version permalink anchor after a save', async () => {
    render(<SectionEditPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/versions/$versionId/details',
      params: { slug: 'riverton', id: 'svc-1', versionId: 'ver-2' },
      hash: 'service-description',
    });
  });

  it('refuses to edit a non-draft version', async () => {
    queryRef.current = { data: detail({ status: 'published' }), isPending: false, isError: false };
    render(<SectionEditPage />);

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
    render(<SectionEditPage />);

    expect(await screen.findByText(/no longer part of the service definition/)).toBeInTheDocument();
  });

  it('surfaces an unregistered editor key instead of a blank page', async () => {
    const named = detail();
    named.definitions['tv-1'] = {
      schema: SCHEMA,
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Group',
            label: 'Service description',
            options: { edit: { editor: 'nope' } },
            elements: [],
          },
        ],
      },
    };
    queryRef.current = { data: named, isPending: false, isError: false };
    render(<SectionEditPage />);

    expect(await screen.findByText(/No editor is registered for/)).toBeInTheDocument();
  });

  it('reports a failed load', async () => {
    queryRef.current = { data: undefined, isPending: false, isError: true };
    render(<SectionEditPage />);

    expect(await screen.findByText(/couldn’t be loaded/)).toBeInTheDocument();
  });
});

describe('SectionEditPage — canonical (no versionId) route', () => {
  beforeEach(() => {
    paramsRef.current = { slug: 'riverton', id: 'svc-1', sectionId: 'service-description' };
  });

  it('edits the sole draft version when nothing is published', async () => {
    render(<SectionEditPage />);

    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('navigates back to the canonical details anchor after a save', async () => {
    render(<SectionEditPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id/details',
      params: { slug: 'riverton', id: 'svc-1' },
      hash: 'service-description',
    });
  });

  it('refuses the edit once a published version exists (it resolves to that one)', async () => {
    queryRef.current = { data: detail({ status: 'published' }), isPending: false, isError: false };
    render(<SectionEditPage />);

    expect(await screen.findByText(/Only draft versions can be edited/)).toBeInTheDocument();
  });
});
