import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleHeader } from '@/components/console/console-header';

let mockPathname = '/app/riverton/services';
vi.mock('@tanstack/react-router', () => ({
  useLocation: (options?: { select?: (location: any) => any }) => {
    const location = { pathname: mockPathname };
    return options?.select ? options.select(location) : location;
  },
  Link: ({ to, params, children, ...props }: any) => (
    <a href={to.replace('$slug', params?.slug ?? '')} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@repo/ui/icon', () => ({
  Icon: (props: any) => <svg data-testid="mock-icon" {...props} />,
}));

vi.mock('@/components/console/workspace-switcher', () => ({
  WorkspaceSwitcher: () => <div data-testid="mock-workspace-switcher">Workspace Switcher</div>,
}));

vi.mock('@/components/console/profile-menu', () => ({
  ProfileMenu: () => <div data-testid="mock-profile-menu">Profile Menu</div>,
}));

vi.mock('@/components/console/notifications-menu', () => ({
  NotificationsMenu: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="mock-notifications-menu" data-disabled={String(disabled)}>
      Notifications Menu
    </div>
  ),
}));

vi.mock('@/components/console/command-palette', () => ({
  CommandPalette: ({ open, onOpenChange, slug }: any) => (
    <div data-testid="mock-command-palette" data-open={String(open)} data-slug={slug}>
      <button onClick={() => onOpenChange(false)}>Close Palette</button>
      Command Palette
    </div>
  ),
}));

describe('ConsoleHeader (top bar) Component Test Suite', () => {
  beforeEach(() => {
    mockPathname = '/app/riverton/services';
    vi.clearAllMocks();
  });

  it('renders the brand, workspace switcher, and account menu', () => {
    render(<ConsoleHeader slug="riverton" />);

    expect(screen.getByText('Operations Portal')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mock-workspace-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('mock-profile-menu')).toBeInTheDocument();
  });

  it('renders the five primary nav links with slug-resolved hrefs', () => {
    render(<ConsoleHeader slug="riverton" />);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/app/riverton');
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute(
      'href',
      '/app/riverton/services',
    );
    expect(screen.getByRole('link', { name: 'Service Requests' })).toHaveAttribute(
      'href',
      '/app/riverton/submissions',
    );
    expect(screen.getByRole('link', { name: 'Shared Resources' })).toHaveAttribute(
      'href',
      '/app/riverton/shared-resources',
    );
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/app/riverton/settings',
    );
  });

  it('does not render the removed sidebar toggle or the global "New" action', () => {
    render(<ConsoleHeader slug="riverton" />);

    expect(screen.queryByRole('button', { name: /toggle sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^new$/i })).not.toBeInTheDocument();
  });

  it('enables search + notifications and opens the command palette when a workspace is active', async () => {
    const user = userEvent.setup();
    render(<ConsoleHeader slug="riverton" />);

    const searchBtn = screen.getByRole('button', { name: 'Search' });
    expect(searchBtn).toBeEnabled();
    expect(screen.getByTestId('mock-notifications-menu')).toHaveAttribute('data-disabled', 'false');

    await user.click(searchBtn);
    const palette = screen.getByTestId('mock-command-palette');
    expect(palette).toHaveAttribute('data-open', 'true');
    expect(palette).toHaveAttribute('data-slug', 'riverton');

    await user.click(screen.getByRole('button', { name: 'Close Palette' }));
    expect(palette).toHaveAttribute('data-open', 'false');
  });

  it('disables actions and shows non-navigable nav when there is no active workspace', () => {
    render(<ConsoleHeader slug={undefined} />);

    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    expect(screen.getByTestId('mock-notifications-menu')).toHaveAttribute('data-disabled', 'true');
    expect(screen.queryByTestId('mock-command-palette')).not.toBeInTheDocument();

    // Nav labels still render, but as disabled spans (not links) for all top nav items (L52).
    const navItemLabels = [
      'Overview',
      'Services',
      'Service Requests',
      'Shared Resources',
      'Settings',
    ];
    for (const label of navItemLabels) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
      const disabledSpan = screen.getByText(label);
      expect(disabledSpan).toHaveAttribute('aria-disabled', 'true');
      expect(disabledSpan.tagName.toLowerCase()).toBe('span');
    }
  });

  it('renders the minimal variant (brand + notifications + avatar only) with no workspace context (L93)', () => {
    render(<ConsoleHeader slug={undefined} minimal />);

    // Brand + right-side actions remain.
    expect(screen.getByText('Operations Portal')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('mock-notifications-menu')).toBeInTheDocument();
    expect(screen.getByTestId('mock-notifications-menu')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('mock-profile-menu')).toBeInTheDocument();

    // Switcher, primary nav, and search are all gone.
    expect(screen.queryByTestId('mock-workspace-switcher')).not.toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('renders minimal variant with active workspace and enabled notifications (L93)', () => {
    render(<ConsoleHeader slug="riverton" minimal={true} />);

    expect(screen.getByTestId('mock-notifications-menu')).toHaveAttribute('data-disabled', 'false');
    expect(screen.queryByTestId('mock-workspace-switcher')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('renders full header when minimal is explicitly false', () => {
    render(<ConsoleHeader slug="riverton" minimal={false} />);

    expect(screen.getByTestId('mock-workspace-switcher')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  describe('active link highlighting', () => {
    it('highlights Overview when on /app/:slug or /app/:slug/ and inactive otherwise (L33)', () => {
      mockPathname = '/app/riverton';
      const { rerender } = render(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Overview' })).toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton/';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Overview' })).toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton/other';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveClass('border-bcgov-blue');
    });

    it('highlights Settings when on /app/:slug/settings or /app/:slug/team and inactive otherwise (L36)', () => {
      mockPathname = '/app/riverton/settings';
      const { rerender } = render(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Settings' })).toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton/settings/general';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Settings' })).toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton/team';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Settings' })).toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton/team/members';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Settings' })).toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveClass('border-bcgov-blue');
    });

    it('highlights other nav items (e.g. Services, Service Requests) based on path prefix', () => {
      mockPathname = '/app/riverton/services/srv-1';
      const { rerender } = render(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Services' })).toHaveClass('border-bcgov-blue');
      expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveClass('border-bcgov-blue');
      expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveClass('border-bcgov-blue');

      mockPathname = '/app/riverton/submissions';
      rerender(<ConsoleHeader slug="riverton" />);
      expect(screen.getByRole('link', { name: 'Service Requests' })).toHaveClass(
        'border-bcgov-blue',
      );
      expect(screen.getByRole('link', { name: 'Services' })).not.toHaveClass('border-bcgov-blue');
    });
  });
});
