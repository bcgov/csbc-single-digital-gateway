import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar';

// Sidebar is jsdom-hostile: it depends on use-mobile/matchMedia, a context
// provider, and complex responsive layout. These are pragmatic render-safety
// and a11y checks rather than full behavioral tests.

function TestSidebar() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>Project</SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>Footer</SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}

describe('Sidebar (render-safety)', () => {
  it('mounts the provider tree without throwing', () => {
    expect(() => render(<TestSidebar />)).not.toThrow();
  });

  it('renders sidebar content provided to the menu button', () => {
    render(<TestSidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('exposes the expected exported components as functions', () => {
    expect(typeof SidebarProvider).toBe('function');
    expect(typeof Sidebar).toBe('function');
    expect(typeof SidebarMenuButton).toBe('function');
  });

  it('throws a clear error when Sidebar is used without its provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Sidebar />)).toThrow(/useSidebar must be used within a SidebarProvider/);
    spy.mockRestore();
  });
});
