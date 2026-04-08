import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { mockedEnsureQueryData } from "tests/utils/mocks/tankstack/mock.ensureQueryData";
import { mockUseQueryForActual as mockUseQuery } from "tests/utils/mocks/tankstack/mock.useQueryActual";
import type {
  Params,
  RouteLike,
} from "tests/utils/types/app/routes/routes.type";

// ─── Shared mocks ────────────────────────────────────────────────────────────

const mockRouteUseParams = jest.fn();
const mockConsentStatementQueryOptions = jest.fn((id: string) => ({
  queryKey: ["consent-statement", id],
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
      useParams: mockRouteUseParams,
    });
  }),
}));

jest.mock("@repo/ui", () => ({
  AccordionContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="accordion-content">{children}</div>
  ),
  AccordionGroup: ({
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: string;
  }) => (
    <div data-testid="accordion-group" data-title={title}>
      {children}
    </div>
  ),
  AccordionItem: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="accordion-item">{children}</div>
  ),
  AccordionTrigger: ({ children }: { children?: React.ReactNode }) => (
    <button data-testid="accordion-trigger">{children}</button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  Separator: ({ className }: { className?: string }) => (
    <hr data-testid="separator" className={className} />
  ),
}));

jest.mock("src/features/consent-history/data/consent-statement.query", () => ({
  consentStatementQueryOptions: (...args: unknown[]) =>
    mockConsentStatementQueryOptions(...(args as [string])),
}));

jest.mock("src/features/consent-history/data/public-body-names.query", () => ({
  publicBodyNamesQueryOptions: { queryKey: ["public-body-names"] },
}));

jest.mock("src/features/services/components/lexical-content.component", () => ({
  LexicalContent: ({ content }: { content: unknown }) => (
    <div data-testid="lexical-content" data-content={JSON.stringify(content)} />
  ),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/settings/consent-history/$statementId";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConsentStatement = {
  createdAt: string;
  document: {
    name: string;
    organizationId: string;
  };
  version: {
    content: unknown;
  };
};

type PublicBodiesResponse = {
  payload: { id: string; staticId?: string; name: string }[];
};

const typedRoute = Route as unknown as RouteLike;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const params: Params = { statementId: "stmt-1" };

const buildStatement = (
  overrides?: Partial<ConsentStatement>,
): ConsentStatement => ({
  createdAt: "2024-03-15T00:00:00.000Z",
  document: {
    name: "Privacy Policy",
    organizationId: "org-1",
  },
  version: {
    content: { root: { children: [] } },
  },
  ...overrides,
});

const buildPublicBodies = (
  overrides?: Partial<PublicBodiesResponse>,
): PublicBodiesResponse => ({
  payload: [{ id: "org-1", name: "Ministry of Health" }],
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ConsentStatement Route Test", () => {
  beforeEach(() => {
    typedRoute.useParams = mockRouteUseParams;
    mockRouteUseParams.mockReturnValue(params);
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // ─── Route registration ───────────────────────────────────────────────────

  describe("Route registration", () => {
    it("Should register the route with the correct path", () => {
      const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

      expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
      expect(mockedCreateFileRoute).toHaveBeenCalledWith(
        "/app/settings/consent-history/$statementId",
      );
      expect(typedRoute.path).toBe(
        "/app/settings/consent-history/$statementId",
      );
      expect(typeof typedRoute.options.component).toBe("function");
    });
  });

  // ─── loader ──────────────────────────────────────────────────────────────

  describe("loader", () => {
    it("Should return documentName from the resolved statement", async () => {
      const statement = buildStatement();
      mockedEnsureQueryData.mockResolvedValueOnce(statement);

      const result = await typedRoute.options.loader({ params });

      expect(mockedEnsureQueryData).toHaveBeenCalledTimes(1);
      expect(mockConsentStatementQueryOptions).toHaveBeenCalledWith(
        params.statementId,
      );
      expect(result).toEqual({ documentName: "Privacy Policy" });
    });

    it("Should call consentStatementQueryOptions with the correct statementId", async () => {
      mockedEnsureQueryData.mockResolvedValueOnce(
        buildStatement({
          document: { name: "Freedom of Information", organizationId: "org-2" },
        }),
      );

      await typedRoute.options.loader({ params: { statementId: "stmt-99" } });

      expect(mockConsentStatementQueryOptions).toHaveBeenCalledWith("stmt-99");
    });
  });

  // ─── staticData.breadcrumbs ───────────────────────────────────────────────

  describe("staticData.breadcrumbs", () => {
    it("Should include document name label when loader data is present", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        documentName: "Privacy Policy",
      });

      expect(breadcrumbs).toEqual([
        { label: "Settings", to: "/app/settings" },
        { label: "Consent history", to: "/app/settings/consent-history" },
        { label: "Privacy Policy Statement" },
      ]);
    });

    it("Should omit document name label when loader data is undefined", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs(undefined);

      expect(breadcrumbs).toEqual([
        { label: "Settings", to: "/app/settings" },
        { label: "Consent history", to: "/app/settings/consent-history" },
      ]);
    });

    it("Should omit document name label when documentName is empty string", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        documentName: "",
      });

      expect(breadcrumbs).toEqual([
        { label: "Settings", to: "/app/settings" },
        { label: "Consent history", to: "/app/settings/consent-history" },
      ]);
    });
  });

  // ─── ConsentStatementPage ─────────────────────────────────────────────────

  describe("ConsentStatementPage", () => {
    const RouteComponent = () => {
      const Component = typedRoute.options.component;
      return <Component />;
    };

    it("Should render loading state while statement is fetching", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<RouteComponent />);

      expect(screen.getByText("Loading…")).toBeInTheDocument();
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("Should render error message when query fails", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: "Network failure" },
      });

      render(<RouteComponent />);

      expect(screen.getByText("Error: Network failure")).toBeInTheDocument();
    });

    it("Should render nothing when statement is undefined and not loading", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      const { container } = render(<RouteComponent />);

      expect(container).toBeEmptyDOMElement();
    });

    it("Should render document name as heading", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return {
            data: buildStatement(),
            isLoading: false,
            error: null,
          };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      expect(
        screen.getByRole("heading", { name: "Privacy Policy" }),
      ).toBeInTheDocument();
    });

    it("Should render formatted consent date", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return {
            data: buildStatement({ createdAt: "2024-03-15T00:00:00.000Z" }),
            isLoading: false,
            error: null,
          };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      const formatted = new Date("2024-03-15T00:00:00.000Z").toLocaleDateString(
        [],
        { year: "numeric", month: "long", day: "numeric" },
      );
      expect(screen.getAllByText(formatted)).toHaveLength(2);
    });

    it("Should render organization name resolved from publicBodies by id", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return {
            data: buildStatement({
              document: { name: "Privacy Policy", organizationId: "org-1" },
            }),
            isLoading: false,
            error: null,
          };
        }
        return {
          data: buildPublicBodies({
            payload: [{ id: "org-1", name: "Ministry of Health" }],
          }),
        };
      });

      render(<RouteComponent />);

      expect(screen.getByText("Ministry of Health")).toBeInTheDocument();
    });

    it("Should resolve organization name by staticId when id does not match", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return {
            data: buildStatement({
              document: {
                name: "Privacy Policy",
                organizationId: "static-org-1",
              },
            }),
            isLoading: false,
            error: null,
          };
        }
        return {
          data: buildPublicBodies({
            payload: [
              {
                id: "org-999",
                staticId: "static-org-1",
                name: "Ministry of Finance",
              },
            ],
          }),
        };
      });

      render(<RouteComponent />);

      expect(screen.getByText("Ministry of Finance")).toBeInTheDocument();
    });

    it("Should fall back to organizationId when no publicBody matches", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return {
            data: buildStatement({
              document: {
                name: "Privacy Policy",
                organizationId: "unknown-org",
              },
            }),
            isLoading: false,
            error: null,
          };
        }
        return { data: buildPublicBodies({ payload: [] }) };
      });

      render(<RouteComponent />);

      expect(screen.getByText("unknown-org")).toBeInTheDocument();
    });

    it("Should render LexicalContent with statement version content", () => {
      const content = { root: { children: [{ type: "paragraph" }] } };
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return {
            data: buildStatement({ version: { content } }),
            isLoading: false,
            error: null,
          };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      const lexical = screen.getByTestId("lexical-content");
      expect(lexical).toBeInTheDocument();
      expect(lexical).toHaveAttribute("data-content", JSON.stringify(content));
    });

    it("Should render separator with bcgov-gold class", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return { data: buildStatement(), isLoading: false, error: null };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      expect(screen.getByTestId("separator")).toHaveClass("bg-bcgov-gold");
    });

    it("Should render accordion sidebar with Resources & support heading", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return { data: buildStatement(), isLoading: false, error: null };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      const group = screen.getByTestId("accordion-group");
      expect(group).toBeInTheDocument();
      expect(group).toHaveAttribute("data-title", "Resources & support");
      expect(screen.getByTestId("accordion-trigger")).toHaveTextContent(
        "Recommended Reading",
      );
    });

    it("Should call consentStatementQueryOptions with statementId from useParams", () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<RouteComponent />);

      expect(mockConsentStatementQueryOptions).toHaveBeenCalledWith("stmt-1");
    });

    it("Should render Consent Statement section heading", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return { data: buildStatement(), isLoading: false, error: null };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      expect(
        screen.getByRole("heading", { name: "Consent Statement" }),
      ).toBeInTheDocument();
    });

    it("Should render Overview section heading", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return { data: buildStatement(), isLoading: false, error: null };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      expect(
        screen.getByRole("heading", { name: "Overview" }),
      ).toBeInTheDocument();
    });

    it("Should render static valid until text", () => {
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-statement") {
          return { data: buildStatement(), isLoading: false, error: null };
        }
        return { data: buildPublicBodies() };
      });

      render(<RouteComponent />);

      expect(
        screen.getByText("Until the program concludes"),
      ).toBeInTheDocument();
    });
  });
});
