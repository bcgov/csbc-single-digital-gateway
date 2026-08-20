import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceDetail, ServiceVersion } from '@/lib/services';

const { navigateMock, paramsRef, queryRef } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  paramsRef: {
    current: { slug: 'riverton', id: 'svc-1' } as {
      slug: string;
      id: string;
      versionId?: string;
    },
  },
  queryRef: {
    current: { data: undefined, isPending: false, isError: false } as {
      data: unknown;
      isPending: boolean;
      isError: boolean;
    },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => queryRef.current,
  queryOptions: (options: unknown) => options,
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => paramsRef.current,
  useNavigate: () => navigateMock,
  useLocation: (options?: { select?: (l: { hash: string }) => unknown }) => {
    const location = { hash: '' };
    return options?.select ? options.select(location) : location;
  },
}));

// JSONForms + Lexical are heavy and covered in @repo/react. Stand in a renderer that mirrors the
// one behaviour this page depends on: GroupLayoutRenderer emits the section's <h2> heading itself.
vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: ({
    uischema,
    data,
  }: {
    uischema: { elements?: Array<Record<string, unknown>> };
    data: Record<string, unknown>;
  }) => (
    <div data-testid="jsonforms" data-data={JSON.stringify(data)}>
      {(uischema.elements ?? []).map((element, index) => (
        <div
          key={index}
          data-testid="element"
          data-type={String(element.type ?? '')}
          data-scope={String(element.scope ?? '')}
        >
          {element.type === 'Group' ? <h2>{String(element.label ?? '')}</h2> : null}
        </div>
      ))}
    </div>
  ),
}));
vi.mock('@repo/react/jsonforms-renderers-display', () => ({ displayRenderers: [] }));

import { ServiceDetailsPage } from '@/components/console/services/service-details-page';

const control = (scope: string) => ({ type: 'Control', scope });
const group = (label: string, elements: unknown[] = []) => ({ type: 'Group', label, elements });

const UISCHEMA = {
  type: 'VerticalLayout',
  elements: [
    control('#/properties/title'),
    control('#/properties/description'),
    group('Service description', [control('#/properties/service_description/properties/about')]),
    group('Eligibility criteria'),
    group('Data & privacy'),
  ],
};

const version = (over: Partial<ServiceVersion> = {}): ServiceVersion => ({
  id: 'v-1',
  documentId: 'svc-1',
  typeVersionId: 'tv-1',
  version: 1,
  status: 'published',
  data: { title: 'Business licence' },
  createdAt: '2026-07-15T00:00:00Z',
  publishedAt: '2026-07-15T00:00:00Z',
  archivedAt: null,
  ...over,
});

const detail = (over: Partial<ServiceDetail> = {}): ServiceDetail => ({
  service: {
    id: 'svc-1',
    workspaceId: 'ws-1',
    title: 'Business licence',
    description: 'Apply for a licence',
    createdAt: '2026-07-15T00:00:00Z',
    updatedAt: '2026-07-15T00:00:00Z',
  },
  versions: [version()],
  definition: { schema: { type: 'object' }, uischema: UISCHEMA },
  definitions: { 'tv-1': { schema: { type: 'object' }, uischema: UISCHEMA } },
  hasSubmissions: false,
  ...over,
});

const arrange = (data: ServiceDetail | undefined, over: Partial<typeof queryRef.current> = {}) => {
  queryRef.current = { data, isPending: false, isError: false, ...over };
};

const sections = (container: HTMLElement) => [...container.querySelectorAll('section')];

beforeEach(() => {
  navigateMock.mockClear();
  paramsRef.current = { slug: 'riverton', id: 'svc-1' };
  arrange(detail());
});

afterEach(cleanup);

/**
 * Feature 174. The Service details page renders the service read-only from `definition.schema` /
 * `definition.uischema` / the selected version's `data`, with one anchored `<section>` per top-level
 * uischema `Group`.
 */
describe('ServiceDetailsPage', () => {
  describe('section rendering', () => {
    it('should render one section per top-level Group, with the Group label as its heading', () => {
      const { container } = render(<ServiceDetailsPage />);

      // 3 derived Groups + the always-on Configuration section.
      expect(sections(container)).toHaveLength(4);
      expect(screen.getByRole('heading', { name: 'Service description' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Eligibility criteria' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Data & privacy' })).toBeInTheDocument();
    });

    it('should give each section an id matching the derived anchor', () => {
      const { container } = render(<ServiceDetailsPage />);

      expect(sections(container).map((section) => section.id)).toEqual([
        'service-description',
        'eligibility-criteria',
        'data-privacy',
        'configuration',
      ]);
    });

    it('should not render a duplicate heading (GroupLayoutRenderer already emits the h2)', () => {
      render(<ServiceDetailsPage />);

      // Exactly one heading per section — the page must not add its own SectionHeading on top.
      expect(screen.getAllByRole('heading', { name: 'Service description' })).toHaveLength(1);
      expect(screen.getAllByRole('heading', { name: 'Eligibility criteria' })).toHaveLength(1);
    });

    it('should render an empty Group as a headed, anchored section with no fields', () => {
      const { container } = render(<ServiceDetailsPage />);

      const empty = container.querySelector('#eligibility-criteria');
      expect(empty).not.toBeNull();
      expect(within(empty as HTMLElement).getByRole('heading')).toHaveTextContent(
        'Eligibility criteria',
      );
      // The Group is dispatched, but it carries no child controls.
      expect(within(empty as HTMLElement).queryByTestId('element')?.dataset.type).toBe('Group');
    });

    it('should render the authored values from the selected version data', () => {
      arrange(
        detail({
          versions: [version({ data: { title: 'X', service_description: { about: {} } } })],
        }),
      );

      const { container } = render(<ServiceDetailsPage />);

      const section = container.querySelector('#service-description');
      expect(within(section as HTMLElement).getByTestId('jsonforms').dataset.data).toBe(
        JSON.stringify({ title: 'X', service_description: { about: {} } }),
      );
    });
  });

  describe('always-on sections', () => {
    it('should always render the Configuration section, whatever the definition says', () => {
      arrange(
        detail({
          definition: { schema: {}, uischema: { type: 'VerticalLayout', elements: [] } },
          definitions: {
            'tv-1': { schema: {}, uischema: { type: 'VerticalLayout', elements: [] } },
          },
        }),
      );

      const { container } = render(<ServiceDetailsPage />);

      expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
      expect(container.querySelector('#configuration')).not.toBeNull();
    });

    it('should render always-on sections last, after the derived ones', () => {
      const { container } = render(<ServiceDetailsPage />);

      expect(sections(container).at(-1)?.id).toBe('configuration');
    });

    it('should suffix the anchor when the definition authors a clashing Group', () => {
      arrange(
        detail({
          definition: {
            schema: {},
            uischema: { type: 'VerticalLayout', elements: [group('Configuration')] },
          },
          definitions: {
            'tv-1': {
              schema: {},
              uischema: { type: 'VerticalLayout', elements: [group('Configuration')] },
            },
          },
        }),
      );

      const { container } = render(<ServiceDetailsPage />);

      // The authored Group keeps `configuration`; the always-on one steps aside so no `#hash`
      // ever resolves to two elements.
      expect(sections(container).map((section) => section.id)).toEqual([
        'configuration',
        'configuration-2',
      ]);
    });
  });

  describe('page chrome', () => {
    it('should omit title and description from the body (they are in the page header)', () => {
      render(<ServiceDetailsPage />);

      const scopes = screen
        .getAllByTestId('element')
        .map((element) => element.dataset.scope)
        .filter((scope) => scope !== '');
      expect(scopes).not.toContain('#/properties/title');
      expect(scopes).not.toContain('#/properties/description');
    });

    it('should render the version picker in the header extra slot', () => {
      render(<ServiceDetailsPage />);

      expect(screen.getByRole('button', { name: /Version v1/ })).toBeInTheDocument();
    });
  });

  describe('version selection', () => {
    it('should show the latest published version on the bare details route', () => {
      arrange(
        detail({
          versions: [
            version({ id: 'v-1', version: 1, status: 'published' }),
            version({ id: 'v-2', version: 2, status: 'draft', publishedAt: null }),
          ],
        }),
      );

      render(<ServiceDetailsPage />);

      // The picker reflects the selection: v1 (published), not the newer draft.
      expect(screen.getByRole('button', { name: /Version v1/ })).toBeInTheDocument();
    });

    it('should navigate to …/versions/$versionId/detailss when another version is picked', async () => {
      const user = userEvent.setup();
      arrange(
        detail({
          versions: [
            version({ id: 'v-1', version: 1, status: 'published' }),
            version({ id: 'v-2', version: 2, status: 'draft', publishedAt: null }),
          ],
        }),
      );
      render(<ServiceDetailsPage />);

      await user.click(screen.getByRole('button', { name: /Version v1/ }));
      await user.click(await screen.findByRole('menuitem', { name: /v2/i }));

      expect(navigateMock).toHaveBeenCalledWith({
        to: '/app/$slug/services/$id/versions/$versionId/details',
        params: { slug: 'riverton', id: 'svc-1', versionId: 'v-2' },
      });
    });

    it('should navigate back to the bare details route when the published version is picked', async () => {
      const user = userEvent.setup();
      paramsRef.current = { slug: 'riverton', id: 'svc-1', versionId: 'v-2' };
      arrange(
        detail({
          versions: [
            version({ id: 'v-1', version: 1, status: 'published' }),
            version({ id: 'v-2', version: 2, status: 'draft', publishedAt: null }),
          ],
        }),
      );
      render(<ServiceDetailsPage />);

      await user.click(screen.getByRole('button', { name: /Version v2/ }));
      await user.click(await screen.findByRole('menuitem', { name: /v1/i }));

      expect(navigateMock).toHaveBeenCalledWith({
        to: '/app/$slug/services/$id/details',
        params: { slug: 'riverton', id: 'svc-1' },
      });
    });

    it('should render the version named in the path on the versions detail route', () => {
      paramsRef.current = { slug: 'riverton', id: 'svc-1', versionId: 'v-2' };
      arrange(
        detail({
          versions: [
            version({ id: 'v-1', version: 1, status: 'published' }),
            version({
              id: 'v-2',
              version: 2,
              status: 'draft',
              publishedAt: null,
              data: { marker: 'draft-data' },
            }),
          ],
        }),
      );

      render(<ServiceDetailsPage />);

      expect(screen.getByRole('button', { name: /Version v2/ })).toBeInTheDocument();
      expect(screen.getAllByTestId('jsonforms')[0]?.dataset.data).toBe(
        JSON.stringify({ marker: 'draft-data' }),
      );
    });

    it('should render a version against its OWN template, not the current one', () => {
      // v-2 is pinned to an older type version whose uischema has a single, differently-named Group.
      paramsRef.current = { slug: 'riverton', id: 'svc-1', versionId: 'v-2' };
      const legacyUischema = { type: 'VerticalLayout', elements: [group('Legacy overview')] };
      arrange(
        detail({
          versions: [
            version({ id: 'v-1', version: 1, status: 'published', typeVersionId: 'tv-1' }),
            version({
              id: 'v-2',
              version: 2,
              status: 'archived',
              publishedAt: null,
              typeVersionId: 'tv-legacy',
            }),
          ],
          definitions: {
            'tv-1': { schema: { type: 'object' }, uischema: UISCHEMA },
            'tv-legacy': { schema: { type: 'object' }, uischema: legacyUischema },
          },
        }),
      );

      const { container } = render(<ServiceDetailsPage />);

      expect(sections(container).map((section) => section.id)).toEqual([
        'legacy-overview',
        'configuration',
      ]);
      expect(screen.getByRole('heading', { name: 'Legacy overview' })).toBeInTheDocument();
    });
  });

  describe('empty and error states', () => {
    it('should render the not-published empty state for a service with no published version', () => {
      arrange(detail({ versions: [version({ status: 'draft', publishedAt: null })] }));

      const { container } = render(<ServiceDetailsPage />);

      expect(screen.getByText(/hasn’t been published yet/)).toBeInTheDocument();
      // No version selected → no body at all, not even the always-on section.
      expect(sections(container)).toHaveLength(0);
    });

    it('should render an unknown-version message when the path version does not exist', () => {
      paramsRef.current = { slug: 'riverton', id: 'svc-1', versionId: 'nope' };
      arrange(detail());

      render(<ServiceDetailsPage />);

      expect(screen.getByText(/doesn’t exist/)).toBeInTheDocument();
    });

    it('should render nothing but the header when the definition resolves empty', () => {
      arrange(
        detail({
          definition: { schema: {}, uischema: {} },
          definitions: { 'tv-1': { schema: {}, uischema: {} } },
        }),
      );

      const { container } = render(<ServiceDetailsPage />);

      expect(screen.getByRole('heading', { name: 'Service details' })).toBeInTheDocument();
      // An empty definition derives no Groups, but the console's always-on section still renders.
      expect(sections(container).map((section) => section.id)).toEqual(['configuration']);
    });

    it('should render an error message when the service query fails', () => {
      arrange(undefined, { isError: true });

      render(<ServiceDetailsPage />);

      expect(screen.getByText(/couldn’t be loaded/)).toBeInTheDocument();
    });
  });
});
