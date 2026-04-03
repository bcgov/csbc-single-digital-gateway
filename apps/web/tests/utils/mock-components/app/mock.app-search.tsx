import type { NavItem } from "src/features/app/components/navigation-bar";

export const mockAppSearch = jest.fn(
  ({ navigationItems }: { navigationItems: NavItem[] }) => (
    <div
      data-testid="app-search"
      data-navigation-items={JSON.stringify(navigationItems)}
    />
  ),
);

export const mockAppSearchProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-search-provider">{children}</div>
  ),
);
