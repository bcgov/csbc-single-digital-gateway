import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A mutable location the mocked `useLocation` reads — tests set it to the details route to reveal the
// submenu (which now shows purely based on being on `…/details`, not a click).
const { locationRef, paramsRef, queryRef } = vi.hoisted(() => ({
  locationRef: { current: { pathname: '/', hash: '' } as { pathname: string; hash: string } },
  paramsRef: { current: {} as { versionId?: string } },
  queryRef: {
    current: { data: undefined, isPending: false } as { data: unknown; isPending: boolean },
  },
}));

// Feature 174: the submenu is derived from the SERVICE TYPE definition (`GET /v1/services/definition`),
// so navigation stays stable regardless of which version the body is showing.
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => queryRef.current,
  queryOptions: (options: unknown) => options,
}));

// Mock TanStack Link → a plain anchor so the sidebar renders without a router context. `activeProps`
// / `activeOptions` are irrelevant here (no active matching) — drop them.
vi.mock('@tanstack/react-router', () => ({
  useLocation: (options?: { select?: (l: { pathname: string; hash: string }) => unknown }) => {
    const location = locationRef.current;
    return options?.select ? options.select(location) : location;
  },
  useParams: () => paramsRef.current,
  Link: ({
    to,
    params,
    hash,
    children,
    activeProps: _activeProps,
    activeOptions: _activeOptions,
    ...props
  }: any) => {
    let href = to as string;
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        href = href.replace(`$${key}`, String(val));
      }
    }
    if (hash) {
      href = `${href}#${hash}`;
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

import { ServiceSidebar } from '@/components/console/services/service-sidebar';

const group = (label: string) => ({ type: 'Group', label, elements: [] });

const UISCHEMA = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: '#/properties/title' },
    group('Service description'),
    group('Eligibility criteria'),
    group('Application methods'),
    group('Data & privacy'),
  ],
};

const definition = (uischema: Record<string, unknown> = UISCHEMA) => ({ schema: {}, uischema });

const onDetailsRoute = () => {
  locationRef.current = { pathname: '/app/riverton/services/svc-1/details', hash: '' };
};

afterEach(() => {
  cleanup();
  locationRef.current = { pathname: '/', hash: '' };
  paramsRef.current = {};
  queryRef.current = { data: definition(), isPending: false };
});

// Default: settled query with the seeded five-section definition.
queryRef.current = { data: definition(), isPending: false };

describe('ServiceSidebar', () => {
  it('renders the service name and all five section links', () => {
    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    expect(screen.getByText('Business licence')).toBeInTheDocument();

    const dashboard = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboard).toHaveAttribute('href', '/app/riverton/services/svc-1');
    expect(screen.getByRole('link', { name: 'Service details' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/details',
    );
    expect(screen.getByRole('link', { name: 'Service requests' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/requests',
    );
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/analytics',
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/settings',
    );
  });

  it('toggles the collapsed state via the collapse trigger', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />,
    );
    const aside = container.querySelector('aside');
    expect(aside).toHaveAttribute('data-collapsed', 'false');

    const trigger = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(trigger).toHaveAttribute('aria-pressed', 'false');

    await user.click(trigger);

    expect(aside).toHaveAttribute('data-collapsed', 'true');
    const expandTrigger = screen.getByRole('button', { name: 'Expand sidebar' });
    expect(expandTrigger).toHaveAttribute('aria-pressed', 'true');

    await user.click(expandTrigger);
    expect(aside).toHaveAttribute('data-collapsed', 'false');
  });

  it('shows the submenu only on the details route, with section-anchor links', () => {
    // Off the details route: no submenu.
    const { unmount } = render(
      <ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />,
    );
    expect(screen.queryByRole('link', { name: 'Eligibility criteria' })).not.toBeInTheDocument();
    unmount();

    // On the details route: the submenu renders its section anchors.
    onDetailsRoute();
    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    const anchors: Array<[string, string]> = [
      ['Service description', '/app/riverton/services/svc-1/details#service-description'],
      ['Eligibility criteria', '/app/riverton/services/svc-1/details#eligibility-criteria'],
      ['Application methods', '/app/riverton/services/svc-1/details#application-methods'],
      ['Data & privacy', '/app/riverton/services/svc-1/details#data-privacy'],
      // Appended by the console regardless of the definition (SERVICE_ALWAYS_SECTIONS).
      ['Configuration', '/app/riverton/services/svc-1/details#configuration'],
    ];
    for (const [name, href] of anchors) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});

/**
 * Feature 174. The "Service details" submenu stops using the static SERVICE_DETAILS_SECTIONS
 * constant and derives its anchors from the service definition's top-level uischema Groups. While
 * the service query is pending it shows skeleton rows.
 */
describe('ServiceSidebar — schema-derived submenu (feature 174)', () => {
  it('should derive the submenu anchors from the uischema Groups, not the static constant', () => {
    onDetailsRoute();
    queryRef.current = {
      data: definition({
        type: 'VerticalLayout',
        elements: [group('Overview'), group('Fees & timelines')],
      }),
      isPending: false,
    };

    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/details#overview',
    );
    expect(screen.getByRole('link', { name: 'Fees & timelines' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/details#fees-timelines',
    );
    // The old hardcoded sections are gone — they came from the constant, not the definition.
    expect(screen.queryByRole('link', { name: 'Eligibility criteria' })).not.toBeInTheDocument();
    // …but the always-on Configuration section survives an arbitrary definition.
    expect(screen.getByRole('link', { name: 'Configuration' })).toBeInTheDocument();
  });

  it('should render skeleton rows while the service query is pending', () => {
    onDetailsRoute();
    queryRef.current = { data: undefined, isPending: true };

    const { container } = render(
      <ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('should never render the stale static section list while pending', () => {
    onDetailsRoute();
    queryRef.current = { data: undefined, isPending: true };

    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    // A stale-then-corrected list would move links under the cursor.
    for (const label of ['Service description', 'Eligibility criteria', 'Configuration']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('should mark the pending skeleton rows aria-hidden', () => {
    onDetailsRoute();
    queryRef.current = { data: undefined, isPending: true };

    const { container } = render(
      <ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />,
    );

    const list = container.querySelector('aside ul[aria-hidden]');
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll('[data-slot="skeleton"]').length).toBe(5);
  });

  it('should render an empty submenu (no skeletons) when the derivation yields no sections', () => {
    onDetailsRoute();
    queryRef.current = {
      data: definition({ type: 'VerticalLayout', elements: [] }),
      isPending: false,
    };

    const { container } = render(
      <ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
    // Only the always-on sections remain when the definition derives nothing.
    expect(screen.getByRole('link', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Service description' })).not.toBeInTheDocument();
  });

  it('should link each anchor to …/details#<anchor>', () => {
    onDetailsRoute();

    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    expect(screen.getByRole('link', { name: 'Data & privacy' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/details#data-privacy',
    );
  });

  it('should keep the submenu on the version permalink route, linking to that version', () => {
    // Regression: matching only `…/details` made the submenu vanish as soon as a non-published
    // version was picked from the header.
    locationRef.current = {
      pathname: '/app/riverton/services/svc-1/versions/v-9/details',
      hash: '',
    };

    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    expect(screen.getByRole('link', { name: 'Service description' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/versions/v-9/details#service-description',
    );
    expect(screen.getByRole('link', { name: 'Configuration' })).toHaveAttribute(
      'href',
      '/app/riverton/services/svc-1/versions/v-9/details#configuration',
    );
  });
});
