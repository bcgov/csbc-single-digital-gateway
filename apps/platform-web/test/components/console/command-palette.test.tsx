import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/console/command-palette';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('CommandPalette', () => {
  it('renders nothing when open is false', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} slug="riverton" />);

    // Check that elements from the dialog are not in the document
    expect(screen.queryByPlaceholderText('Search or jump to…')).not.toBeInTheDocument();
  });

  it('renders search input and destinations when open is true', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} slug="riverton" />);

    // Search input
    expect(screen.getByPlaceholderText('Search or jump to…')).toBeInTheDocument();

    // Check destinations
    expect(screen.getByText('Go to')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Submissions')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('calls onOpenChange on pressing Cmd+K or Ctrl+K key combination', () => {
    const handleOpenChange = vi.fn();
    render(<CommandPalette open={false} onOpenChange={handleOpenChange} slug="riverton" />);

    // Press Ctrl+K
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Press Cmd+K (metaKey)
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Pressing K alone should not trigger open change
    fireEvent.keyDown(document, { key: 'k' });
    expect(handleOpenChange).toHaveBeenCalledTimes(2);

    // Pressing Ctrl+A should not trigger open change (ctrlKey is true, key is not 'k')
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
    expect(handleOpenChange).toHaveBeenCalledTimes(2);

    // Pressing Cmd+A should not trigger open change (metaKey is true, key is not 'k')
    fireEvent.keyDown(document, { key: 'a', metaKey: true });
    expect(handleOpenChange).toHaveBeenCalledTimes(2);
  });

  it('navigates to workspace-scoped route and closes on item select', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    render(<CommandPalette open={true} onOpenChange={handleOpenChange} slug="riverton" />);

    const servicesItem = screen.getByText('Services');
    await user.click(servicesItem);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services',
      params: { slug: 'riverton' },
    });
  });

  it('navigates to non-scoped route and closes on item select', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    render(<CommandPalette open={true} onOpenChange={handleOpenChange} slug="riverton" />);

    const accountItem = screen.getByText('Account');
    await user.click(accountItem);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/account',
    });
  });
});
