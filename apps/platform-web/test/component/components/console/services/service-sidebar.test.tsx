import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A mutable location the mocked `useLocation` reads — tests set it to the details route to reveal the
// submenu (which now shows purely based on being on `…/details`, not a click).
const { locationRef } = vi.hoisted(() => ({
  locationRef: { current: { pathname: '/', hash: '' } as { pathname: string; hash: string } },
}));

// Mock TanStack Link → a plain anchor so the sidebar renders without a router context. `activeProps`
// / `activeOptions` are irrelevant here (no active matching) — drop them.
vi.mock('@tanstack/react-router', () => ({
  useLocation: (options?: { select?: (l: { pathname: string; hash: string }) => unknown }) => {
    const location = locationRef.current;
    return options?.select ? options.select(location) : location;
  },
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

afterEach(() => {
  cleanup();
  locationRef.current = { pathname: '/', hash: '' };
});

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
    locationRef.current = { pathname: '/app/riverton/services/svc-1/details', hash: '' };
    render(<ServiceSidebar slug="riverton" id="svc-1" serviceName="Business licence" />);

    const anchors: Array<[string, string]> = [
      ['Service description', '/app/riverton/services/svc-1/details#service-description'],
      ['Eligibility criteria', '/app/riverton/services/svc-1/details#eligibility-criteria'],
      ['Application methods', '/app/riverton/services/svc-1/details#application-methods'],
      ['Data & privacy', '/app/riverton/services/svc-1/details#data-privacy'],
      ['Configuration', '/app/riverton/services/svc-1/details#configuration'],
    ];
    for (const [name, href] of anchors) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});
