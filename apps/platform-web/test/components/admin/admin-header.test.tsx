import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminHeader } from '@/components/admin/admin-header';

let currentPath = '/admin';

// Mock useLocation from TanStack Router, supporting the select option
vi.mock('@tanstack/react-router', () => ({
  useLocation: vi.fn((opts?: { select?: (location: { pathname: string }) => any }) => {
    const location = { pathname: currentPath };
    if (opts?.select) {
      return opts.select(location);
    }
    return location;
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  currentPath = '/admin';
});

describe('AdminHeader', () => {
  it('renders the header with the Overview section label and subtitle when on /admin', () => {
    currentPath = '/admin';
    const handleToggle = vi.fn();
    render(<AdminHeader onToggleSidebar={handleToggle} />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Platform administration.')).toBeInTheDocument();
  });

  it('renders the header with the Document Types section label and subtitle when on /admin/document-types', () => {
    currentPath = '/admin/document-types';
    const handleToggle = vi.fn();
    render(<AdminHeader onToggleSidebar={handleToggle} />);

    expect(screen.getByRole('heading', { name: 'Document Types' })).toBeInTheDocument();
    expect(
      screen.getByText('Manage the document type definitions available to workspaces.'),
    ).toBeInTheDocument();
  });

  it('calls onToggleSidebar when the toggle button is clicked', async () => {
    currentPath = '/admin';
    const handleToggle = vi.fn();
    const user = userEvent.setup();
    render(<AdminHeader onToggleSidebar={handleToggle} />);

    const toggleButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    await user.click(toggleButton);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });
});
