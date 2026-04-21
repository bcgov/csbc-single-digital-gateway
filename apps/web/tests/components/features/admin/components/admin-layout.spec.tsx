import { cleanup, render, screen } from "@testing-library/react";

jest.mock("src/features/admin/components/admin-navigation-bar.component", () => ({
  AdminNavigationBar: () => <nav data-testid="admin-nav-bar" />,
}));

jest.mock("src/features/app/components/breadcrumbs", () => ({
  Breadcrumbs: ({ contained }: { contained?: boolean }) => (
    <div data-testid="breadcrumbs" data-contained={String(contained ?? true)} />
  ),
}));

import { AdminLayout } from "src/features/admin/components/admin-layout.component";

describe("AdminLayout", () => {
  afterEach(cleanup);

  it("Should render navigation bar, breadcrumbs, and children", () => {
    render(
      <AdminLayout>
        <div data-testid="child-content">Hello</div>
      </AdminLayout>,
    );

    expect(screen.getByTestId("admin-nav-bar")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toHaveAttribute("data-contained", "false");
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});
