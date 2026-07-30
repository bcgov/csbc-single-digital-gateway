import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/console/command-palette';
import { authedUser, mockAuth, renderApp } from '../../../support/render-app';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CommandPalette Component Test Suite', () => {
  it('opens from the header search button and lists the console destinations', async () => {
    mockAuth(authedUser, {
      workspaces: [
        {
          id: 'w1',
          slug: 'riverton',
          name: 'Riverton',
          role: 'admin',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    renderApp('/app/riverton');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /search/i }, { timeout: 32000 }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Submissions')).toBeInTheDocument();
    expect(within(dialog).getByText('Reports')).toBeInTheDocument();
    expect(within(dialog).getByText('Account')).toBeInTheDocument();
  });

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

    // Press Ctrl+k
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Press Cmd+k (metaKey)
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Press Ctrl+K (uppercase)
    fireEvent.keyDown(document, { key: 'K', ctrlKey: true });
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Pressing K alone should not trigger open change
    fireEvent.keyDown(document, { key: 'k' });
    expect(handleOpenChange).toHaveBeenCalledTimes(3);

    // Pressing Ctrl+A should not trigger open change (ctrlKey is true, key is not 'k')
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
    expect(handleOpenChange).toHaveBeenCalledTimes(3);

    // Pressing Cmd+A should not trigger open change (metaKey is true, key is not 'k')
    fireEvent.keyDown(document, { key: 'a', metaKey: true });
    expect(handleOpenChange).toHaveBeenCalledTimes(3);
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
