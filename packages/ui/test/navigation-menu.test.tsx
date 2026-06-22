import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

function renderNavMenu() {
  return render(
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/alpha">Alpha</NavigationMenuLink>
            <NavigationMenuLink href="/beta">Beta</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/docs">Docs</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>,
  );
}

describe('NavigationMenu', () => {
  it('renders the root with the navigation-menu slot', () => {
    const { container } = renderNavMenu();
    const root = container.querySelector('[data-slot="navigation-menu"]');
    expect(root).not.toBeNull();
  });

  it('renders a top-level link as an anchor with its href', () => {
    renderNavMenu();
    const docs = screen.getByText('Docs');
    expect(docs).toHaveAttribute('href', '/docs');
    expect(docs).toHaveAttribute('data-slot', 'navigation-menu-link');
  });

  it('renders a collapsed trigger by default', () => {
    renderNavMenu();
    const trigger = screen.getByText('Products');
    expect(trigger).toHaveAttribute('data-slot', 'navigation-menu-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands the trigger and reveals content links when clicked', async () => {
    const user = userEvent.setup();
    renderNavMenu();
    const trigger = screen.getByText('Products');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText('Alpha')).toHaveAttribute('href', '/alpha');
  });
});
