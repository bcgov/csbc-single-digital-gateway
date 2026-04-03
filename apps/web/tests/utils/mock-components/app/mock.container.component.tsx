export const mockContainer = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
);
