import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar';

function renderMenubar(onSelect?: () => void) {
  return render(
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onSelect}>New File</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Open</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );
}

describe('Menubar', () => {
  it('renders the menubar with closed triggers', () => {
    const { container } = renderMenubar();
    expect(container.querySelector('[data-slot="menubar"]')).not.toBeNull();
    const fileTrigger = screen.getByText('File');
    expect(fileTrigger).toHaveAttribute('data-slot', 'menubar-trigger');
    expect(fileTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a menu and reveals its items when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderMenubar();
    await user.click(screen.getByText('File'));

    const item = await screen.findByText('New File');
    expect(item).toBeInTheDocument();
    expect(screen.getByText('File')).toHaveAttribute('aria-expanded', 'true');
  });

  it('invokes the item handler when a menu item is selected', async () => {
    const user = userEvent.setup();
    let selected = false;
    renderMenubar(() => {
      selected = true;
    });

    await user.click(screen.getByText('File'));
    const item = await screen.findByText('New File');
    await user.click(item);

    expect(selected).toBe(true);
  });
});
