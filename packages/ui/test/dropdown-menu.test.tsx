import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function TestMenu({ onSelect }: { onSelect?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSelect}>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('keeps the menu closed until the trigger is clicked', () => {
    render(<TestMenu />);
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu and renders its items when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
  });

  it('invokes the item handler and closes the menu on selection', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TestMenu onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Profile' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    await screen.findByRole('button', { name: 'Open menu' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
