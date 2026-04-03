import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { mockUseBcscAuth } from "tests/utils/mock-functions/auth/mock.auth.context.useBcscAuth";
import { PublicLayout } from "../../public-layout/public-layout.component";

jest.mock("../../container.component", () => ({
  Container: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

jest.mock("../../public-layout/public-footer.component", () => ({
  PublicFooter: () => (
    <footer data-testid="public-footer">Public Footer</footer>
  ),
}));

jest.mock("../../public-layout/public-header.component", () => ({
  PublicHeader: ({ children }: { children: React.ReactNode }) => (
    <header data-testid="public-header">{children}</header>
  ),
}));

jest.mock("../../public-layout/public-navigation-bar.component", () => ({
  PublicNavigationBar: () => (
    <nav data-testid="public-navigation-bar">Public Navigation</nav>
  ),
}));

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <div data-testid="button" data-variant={variant}>
      {children}
    </div>
  ),
}));

jest.mock("@tanstack/react-router", () => ({
  useNavigate: jest.fn(),
}));

describe("PublicLayout Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBcscAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render the public layout structure", () => {
    render(
      <PublicLayout>
        <div>Page Content</div>
      </PublicLayout>,
    );

    const header = screen.getByTestId("public-header");
    const navigationBar = screen.getByTestId("public-navigation-bar");
    const main = screen.getByRole("main");
    const container = screen.getByTestId("container");
    const footer = screen.getByTestId("public-footer");

    expect(header).toBeInTheDocument();
    expect(navigationBar).toBeInTheDocument();
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(container).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
  });

  it("Should render children inside the container within the main content area", () => {
    render(
      <PublicLayout>
        <section>
          <h1>Public Page</h1>
          <p>Welcome content</p>
        </section>
      </PublicLayout>,
    );

    const main = screen.getByRole("main");
    const container = screen.getByTestId("container");
    const heading = screen.getByRole("heading", { name: "Public Page" });
    const paragraph = screen.getByText("Welcome content");

    expect(heading).toBeInTheDocument();
    expect(paragraph).toBeInTheDocument();
    expect(container).toContainElement(heading);
    expect(container).toContainElement(paragraph);
    expect(main).toContainElement(container);
  });

  it("Should render the public navigation bar inside the public header", () => {
    render(
      <PublicLayout>
        <div>Page Content</div>
      </PublicLayout>,
    );

    const header = screen.getByTestId("public-header");
    const navigationBar = screen.getByTestId("public-navigation-bar");

    expect(header).toContainElement(navigationBar);
  });
});
