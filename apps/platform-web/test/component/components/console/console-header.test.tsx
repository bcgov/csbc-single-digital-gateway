import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsoleHeader } from '@/components/console/console-header';

let mockPathname = '/app/riverton/services';
vi.mock('@tanstack/react-router', () => ({
  useLocation: (options?: { select?: (location: any) => any }) => {
    const location = { pathname: mockPathname };
    if (options?.select) {
      return options.select(location);
    }
    return location;
  },
}));

let mockChrome: any = null;
vi.mock('@/lib/page-chrome', () => ({
  usePageChrome: () => mockChrome,
}));

vi.mock('@/components/console/notifications-menu', () => ({
  NotificationsMenu: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="mock-notifications-menu" data-disabled={String(disabled)}>
      Notifications Menu
    </div>
  ),
}));

vi.mock('@/components/console/new-sheet', () => ({
  NewSheet: ({ slug }: { slug: string | undefined }) => (
    <div data-testid="mock-new-sheet" data-slug={slug ?? ''}>
      New Sheet
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

describe('ConsoleHeader Component Test Suite', () => {
  beforeEach(() => {
    mockPathname = '/app/riverton/services';
    mockChrome = null;
    vi.clearAllMocks();
  });

  it('triggers onToggleSidebar on clicking sidebar toggle button', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    render(<ConsoleHeader onToggleSidebar={handleToggle} slug="riverton" />);

    const toggleBtn = screen.getByRole('button', { name: /toggle sidebar/i });
    await user.click(toggleBtn);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders default section title and subtitle when page chrome is not set', () => {
    mockPathname = '/app/riverton/services';
    render(<ConsoleHeader onToggleSidebar={vi.fn()} slug="riverton" />);

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(
      screen.getByText('Service documents that group related applications.'),
    ).toBeInTheDocument();
  });

  it('renders overridden title and subtitle when page chrome is active', () => {
    mockPathname = '/app/riverton/services/srv-123';
    mockChrome = {
      title: 'Zoning Permits Detail',
      description: 'Review document metadata and stages',
    };
    render(<ConsoleHeader onToggleSidebar={vi.fn()} slug="riverton" />);

    expect(screen.getByRole('heading', { name: 'Zoning Permits Detail' })).toBeInTheDocument();
    expect(screen.getByText('Review document metadata and stages')).toBeInTheDocument();
  });

  it('renders header as enabled when workspace slug is defined', async () => {
    const user = userEvent.setup();
    render(<ConsoleHeader onToggleSidebar={vi.fn()} slug="riverton" />);

    // Search button enabled
    const searchBtn = screen.getByRole('button', { name: 'Search' });
    expect(searchBtn).toBeEnabled();

    // Notifications and new sheet correctly setup
    expect(screen.getByTestId('mock-notifications-menu')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByTestId('mock-new-sheet')).toHaveAttribute('data-slug', 'riverton');

    // Clicking search opens command palette
    await user.click(searchBtn);
    const palette = screen.getByTestId('mock-command-palette');
    expect(palette).toHaveAttribute('data-open', 'true');
    expect(palette).toHaveAttribute('data-slug', 'riverton');

    // Closing works
    const closeBtn = screen.getByRole('button', { name: 'Close Palette' });
    await user.click(closeBtn);
    expect(palette).toHaveAttribute('data-open', 'false');
  });

  it('renders header as disabled when workspace slug is undefined', () => {
    render(<ConsoleHeader onToggleSidebar={vi.fn()} slug={undefined} />);

    // Search button disabled
    const searchBtn = screen.getByRole('button', { name: 'Search' });
    expect(searchBtn).toBeDisabled();

    // Notifications menu is disabled
    expect(screen.getByTestId('mock-notifications-menu')).toHaveAttribute('data-disabled', 'true');

    // Command palette is not rendered (slug is undefined)
    expect(screen.queryByTestId('mock-command-palette')).not.toBeInTheDocument();
  });
});
