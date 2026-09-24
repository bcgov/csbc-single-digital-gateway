import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Feature 217: "Service details" no longer expands into a submenu of section anchors. Those were
 * derived from the service TYPE's uischema (feature 174), and both the type and the schema-driven
 * details page are gone, so the sidebar queries nothing and reads no location.
 */

// Mock TanStack Link → a plain anchor so the sidebar renders without a router context. `activeProps`
// / `activeOptions` are irrelevant here (no active matching) — drop them.
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
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

afterEach(cleanup);

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

  it('renders no section-anchor submenu under Service details', () => {
    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    // The submenu was the only <ul> in the rail; the nav is a flat list of section links.
    expect(screen.queryByRole('link', { name: 'Service description' })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });
});
