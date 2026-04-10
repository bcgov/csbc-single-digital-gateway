import { cleanup, render, screen } from "@testing-library/react";
import { AuthenticatedLayout } from "src/features/app/components/authenticated-layout/authenticated-layout.component";
import type { NavItem } from "src/features/app/components/navigation-bar";

const mockAppSearch = jest.fn(
  ({ navigationItems }: { navigationItems: NavItem[] }) => (
    <div
      data-testid="app-search"
      data-navigation-items={JSON.stringify(navigationItems)}
    />
  ),
);

const mockAppSearchProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-search-provider">{children}</div>
  ),
);

const mockAuthenticatedFooter = jest.fn(() => (
  <footer data-testid="authenticated-footer" />
));

const mockAuthenticatedHeader = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <header data-testid="authenticated-header">{children}</header>
  ),
);

const mockAuthenticatedNavigationBar = jest.fn(() => (
  <div data-testid="authenticated-navigation-bar" />
));

const mockBreadcrumbs = jest.fn(() => <nav data-testid="breadcrumbs" />);

const mockContainer = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="container">{children}</div>
));

jest.mock("src/features/app/components/app-search", () => ({
  AppSearch: (props: { navigationItems: NavItem[] }) => mockAppSearch(props),
}));

jest.mock("src/features/app/components/app-search/app-search.context", () => ({
  AppSearchProvider: (props: { children: React.ReactNode }) =>
    mockAppSearchProvider(props),
}));

jest.mock("src/features/app/components/breadcrumbs", () => ({
  Breadcrumbs: () => mockBreadcrumbs(),
}));

jest.mock("src/features/app/components/container.component", () => ({
  Container: (props: { children: React.ReactNode }) => mockContainer(props),
}));

jest.mock(
  "src/features/app/components/authenticated-layout/authenticated-footer.component",
  () => ({
    AuthenticatedFooter: () => mockAuthenticatedFooter(),
  }),
);

jest.mock(
  "src/features/app/components/authenticated-layout/authenticated-header.component",
  () => ({
    AuthenticatedHeader: (props: { children: React.ReactNode }) =>
      mockAuthenticatedHeader(props),
  }),
);

jest.mock(
  "src/features/app/components/authenticated-layout/authenticated-navigation-bar.component",
  () => ({
    AuthenticatedNavigationBar: () => mockAuthenticatedNavigationBar(),
  }),
);

describe("AuthenticatedLayout Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render the app search provider and authenticated layout sections", () => {
    render(
      <AuthenticatedLayout>
        <div>Page Content</div>
      </AuthenticatedLayout>,
    );

    const provider = screen.getByTestId("app-search-provider");
    const header = screen.getByTestId("authenticated-header");
    const main = document.querySelector("main#main-content");
    const footer = screen.getByTestId("authenticated-footer");
    const appSearch = screen.getByTestId("app-search");

    expect(provider).toBeInTheDocument();
    expect(header).toBeInTheDocument();
    expect(main).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
    expect(appSearch).toBeInTheDocument();
  });

  it("Should apply the expected root layout classes and main accessibility attributes", () => {
    render(
      <AuthenticatedLayout>
        <div>Page Content</div>
      </AuthenticatedLayout>,
    );

    const main = document.querySelector("main#main-content");
    const layoutRoot = main?.parentElement;

    expect(layoutRoot).toBeInTheDocument();
    expect(layoutRoot).toHaveClass("flex");
    expect(layoutRoot).toHaveClass("h-dvh");
    expect(layoutRoot).toHaveClass("flex-col");

    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("flex-auto");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("Should render children inside Container within the main region", () => {
    render(
      <AuthenticatedLayout>
        <div>Page Content</div>
      </AuthenticatedLayout>,
    );

    const main = document.querySelector("main#main-content");
    const container = screen.getByTestId("container");
    const content = screen.getByText("Page Content");

    expect(container).toBeInTheDocument();
    expect(container).toContainElement(content);
    expect(main).toContainElement(container);
  });

  it("Should render the navigation bar and breadcrumbs inside the authenticated header", () => {
    render(
      <AuthenticatedLayout>
        <div>Page Content</div>
      </AuthenticatedLayout>,
    );

    const header = screen.getByTestId("authenticated-header");
    const navigationBar = screen.getByTestId("authenticated-navigation-bar");
    const breadcrumbs = screen.getByTestId("breadcrumbs");

    expect(header).toBeInTheDocument();
    expect(navigationBar).toBeInTheDocument();
    expect(breadcrumbs).toBeInTheDocument();
    expect(header).toContainElement(navigationBar);
    expect(header).toContainElement(breadcrumbs);
  });
});
