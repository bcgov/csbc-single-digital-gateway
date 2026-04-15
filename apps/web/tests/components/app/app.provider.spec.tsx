import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

type RenderOptions = {
  pathname: string;
  bcscLoading: boolean;
  idirLoading: boolean;
};

type AuthType = {
  isLoading: boolean;
  provider: string;
};

type RouterProviderProps = {
  router: unknown;
  context?: { bcscAuth: AuthType; idirAuth: AuthType };
};

type QueryClientProps = { client: unknown; children?: ReactNode };

const renderAppProvider = ({
  pathname,
  bcscLoading,
  idirLoading,
}: RenderOptions) => {
  globalThis.history.pushState({}, "", pathname);
  jest.resetModules();

  const bcscAuth = { isLoading: bcscLoading, provider: "bcsc" };
  const idirAuth = { isLoading: idirLoading, provider: "idir" };

  const mockQueryClient = { id: "query-client" };
  const mockRouter = { id: "router" };

  let capturedRouterProps: RouterProviderProps | null = null;
  let capturedQueryClient: QueryClientProps | null = null;

  jest.doMock("@dr.pogodin/react-helmet", () => ({
    HelmetProvider: ({ children }: { children?: ReactNode }) => (
      <div data-testid="helmet-provider">{children}</div>
    ),
    Helmet: () => <div data-testid="helmet" />,
  }));

  jest.doMock("@repo/ui", () => ({
    Spinner: ({ className }: { className?: string }) => (
      <div data-testid="spinner" className={className} />
    ),
    Toaster: ({ position }: { position?: string }) => (
      <div data-testid="toaster" data-position={position} />
    ),
  }));

  jest.doMock("@tanstack/react-query", () => ({
    QueryClientProvider: ({
      client,
      children,
    }: {
      client: unknown;
      children?: ReactNode;
    }) => {
      capturedQueryClient = { client, children };
      return <div data-testid="query-client-provider">{children}</div>;
    },
  }));

  jest.doMock("@tanstack/react-router", () => ({
    RouterProvider: (props: RouterProviderProps) => {
      capturedRouterProps = props;
      return <div data-testid="router-provider" />;
    },
  }));

  jest.doMock("src/features/auth/auth.context", () => ({
    AuthProvider: ({
      idpType,
      defaultRedirectPath,
      lazy,
      children,
    }: {
      idpType: string;
      defaultRedirectPath: string;
      lazy: boolean;
      children?: ReactNode;
    }) => (
      <div
        data-testid={`auth-provider-${idpType}`}
        data-default-redirect-path={defaultRedirectPath}
        data-lazy={String(lazy)}
      >
        {children}
      </div>
    ),
    useBcscAuth: jest.fn(() => bcscAuth),
    useIdirAuth: jest.fn(() => idirAuth),
  }));

  jest.doMock("src/lib/react-query.client", () => ({
    queryClient: mockQueryClient,
  }));

  jest.doMock("src/app/router", () => ({
    router: mockRouter,
  }));

  // Import after mocks so module-level `isAdminPath` uses current pathname.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppProvider } = require("src/app/provider") as {
    AppProvider: React.ComponentType;
  };

  const utils = render(<AppProvider />);

  return {
    ...utils,
    capturedRouterProps,
    capturedQueryClient,
    mockQueryClient,
    mockRouter,
    bcscAuth,
    idirAuth,
  };
};

describe("AppProvider Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.dontMock("@dr.pogodin/react-helmet");
    jest.dontMock("@repo/ui");
    jest.dontMock("@tanstack/react-query");
    jest.dontMock("@tanstack/react-router");
    jest.dontMock("src/features/auth/auth.context");
    jest.dontMock("src/lib/react-query.client");
    jest.dontMock("src/app/router");
  });

  it("Should show spinner on admin routes while IDIR auth is loading", () => {
    renderAppProvider({
      pathname: "/admin/dashboard",
      bcscLoading: false,
      idirLoading: true,
    });

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("router-provider")).not.toBeInTheDocument();

    expect(screen.getByTestId("auth-provider-bcsc")).toHaveAttribute(
      "data-lazy",
      "true",
    );
    expect(screen.getByTestId("auth-provider-idir")).toHaveAttribute(
      "data-lazy",
      "false",
    );

    expect(screen.getByTestId("toaster")).toHaveAttribute(
      "data-position",
      "top-right",
    );
  });

  it("Should render router on admin routes when IDIR auth is not loading", () => {
    const result = renderAppProvider({
      pathname: "/admin",
      bcscLoading: true,
      idirLoading: false,
    });

    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(screen.getByTestId("router-provider")).toBeInTheDocument();

    const capturedRouterProps =
      result.capturedRouterProps! as RouterProviderProps;

    expect(capturedRouterProps!.router).toBe(result.mockRouter);
    expect(capturedRouterProps!.context).toEqual({
      bcscAuth: result.bcscAuth,
      idirAuth: result.idirAuth,
    });

    const capturedQueryClient = result.capturedQueryClient! as QueryClientProps;
    expect(capturedQueryClient!.client).toBe(result.mockQueryClient);
    expect(capturedQueryClient!.children).toBeTruthy();
  });

  it("Should show spinner on app routes while BCSC auth is loading", () => {
    renderAppProvider({
      pathname: "/app/services",
      bcscLoading: true,
      idirLoading: false,
    });

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("router-provider")).not.toBeInTheDocument();

    expect(screen.getByTestId("auth-provider-bcsc")).toHaveAttribute(
      "data-lazy",
      "false",
    );
    expect(screen.getByTestId("auth-provider-idir")).toHaveAttribute(
      "data-lazy",
      "true",
    );
  });

  it("Should render router on app routes when BCSC auth is not loading", () => {
    renderAppProvider({
      pathname: "/app",
      bcscLoading: false,
      idirLoading: true,
    });

    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(screen.getByTestId("router-provider")).toBeInTheDocument();
  });

  it("Should render router on non-app public routes even if BCSC auth is loading", () => {
    renderAppProvider({
      pathname: "/",
      bcscLoading: true,
      idirLoading: true,
    });

    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    expect(screen.getByTestId("router-provider")).toBeInTheDocument();
  });
});
