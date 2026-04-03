export const mockAuthenticatedFooter = jest.fn(() => (
  <footer data-testid="authenticated-footer" />
));

export const mockAuthenticatedHeader = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <header data-testid="authenticated-header">{children}</header>
  ),
);

export const mockAuthenticatedNavigationBar = jest.fn(() => (
  <div data-testid="authenticated-navigation-bar" />
));
