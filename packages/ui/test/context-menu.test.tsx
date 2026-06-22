import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

function TestContextMenu({ onSelect }: { onSelect?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>Right click here</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuLabel>Actions</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onSelect}>Copy</ContextMenuItem>
          <ContextMenuItem>Paste</ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe('ContextMenu', () => {
  it('renders the trigger and keeps the menu closed initially', () => {
    render(<TestContextMenu />);
    expect(screen.getByText('Right click here')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu with its items on a context-menu (right click) event', async () => {
    const user = userEvent.setup();
    render(<TestContextMenu />);

    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Right click here') });

    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Copy' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Paste' })).toBeInTheDocument();
  });

  it('invokes the item handler and closes the menu on selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TestContextMenu onSelect={onSelect} />);

    await user.pointer({ keys: '[MouseRight]', target: screen.getByText('Right click here') });
    await user.click(await screen.findByRole('menuitem', { name: 'Copy' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
