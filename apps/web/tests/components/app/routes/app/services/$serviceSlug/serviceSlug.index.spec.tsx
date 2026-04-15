import { createFileRoute } from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { mockedEnsureQueryData } from "tests/utils/mocks/tankstack/mock.ensureQueryData";
import { mockUseQuery } from "tests/utils/mocks/tankstack/mock.useQuery";
import {
  type RouteLike,
  type Service,
} from "tests/utils/types/app/routes/routes.type";

// ─── Shared mocks ────────────────────────────────────────────────────────────

const mockRouteUseLoaderData = jest.fn();
const mockNotFound = jest.fn(() => ({ type: "not-found" }));

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
      useLoaderData: mockRouteUseLoaderData,
    });
  }),
  notFound: () => mockNotFound(),
  Link: ({
    children,
    to,
    className,
  }: {
    children?: ReactNode;
    to?: string;
    className?: string;
  }) => (
    <a href={to ?? "#"} data-to={to} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    className,
    asChild,
  }: {
    children?: ReactNode;
    className?: string;
    asChild?: boolean;
  }) =>
    asChild ? (
      // Link is not wrapped in an extra <button> that duplicates the label
      <>{children}</>
    ) : (
      <button className={className}>{children}</button>
    ),
  buttonVariants: () => "btn-class",
  DropdownMenu: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    id,
  }: {
    children?: ReactNode;
    id?: string;
  }) => (
    <div data-testid="dropdown-item" data-id={id}>
      {children}
    </div>
  ),
  AccordionGroup: ({
    children,
    title,
  }: {
    children?: ReactNode;
    title?: string;
  }) => (
    <div data-testid="accordion-group" data-title={title}>
      {children}
    </div>
  ),
  AccordionItem: ({
    children,
    value,
  }: {
    children?: ReactNode;
    value?: string;
  }) => (
    <div data-testid="accordion-item" data-value={value}>
      {children}
    </div>
  ),
  AccordionTrigger: ({ children }: { children?: ReactNode }) => (
    <button data-testid="accordion-trigger">{children}</button>
  ),
  AccordionContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="accordion-content">{children}</div>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconCake: () => <svg data-testid="icon-cake" />,
  IconPlayerPlay: () => <svg data-testid="icon-player-play" />,
}));

jest.mock(
  "src/features/services/components/service-page-navigation.component",
  () => ({
    ServicePageNavigation: ({
      serviceName,
      visible,
    }: {
      serviceName: string;
      visible: boolean;
    }) => (
      <nav
        data-testid="service-page-navigation"
        data-service-name={serviceName}
        data-visible={String(visible)}
      />
    ),
  }),
);

jest.mock(
  "src/features/services/components/eligibility-criteria.component",
  () => ({
    EligibilityCriteria: () => <div data-testid="eligibility-criteria" />,
  }),
);

jest.mock(
  "src/features/services/components/eligibility-criteria.placeholder",
  () => ({
    eligibilityCriteria: [],
  }),
);

jest.mock("src/features/services/components/lexical-content.component", () => ({
  LexicalContent: ({ content }: { content: unknown }) => (
    <div data-testid="lexical-content" data-content={JSON.stringify(content)} />
  ),
}));

jest.mock(
  "src/features/services/components/legal-information-accordion.component",
  () => ({
    LegalInformationAccordion: () => (
      <div data-testid="legal-information-accordion" />
    ),
  }),
);

jest.mock(
  "src/features/services/components/other-services-accordion.component",
  () => ({
    OtherServicesAccordion: () => (
      <div data-testid="other-services-accordion" />
    ),
  }),
);

jest.mock(
  "src/features/services/components/resources-support-accordion.component",
  () => ({
    ResourcesSupportAccordion: () => (
      <div data-testid="resources-support-accordion" />
    ),
  }),
);

jest.mock("src/features/services/data/services.query", () => ({
  servicesQueryOptions: { queryKey: ["services"] },
}));

jest.mock("src/features/services/data/consent-document.query", () => ({
  consentDocumentsByIdQueryOptions: (ids: string[]) => ({
    queryKey: ["consent-documents", ids],
  }),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/services/$serviceSlug/index";

const { servicesQueryOptions: mockServicesQueryOptions } = jest.requireMock(
  "src/features/services/data/services.query",
) as { servicesQueryOptions: { queryKey: string[] } };

// ─── Types ───────────────────────────────────────────────────────────────────

const typedRoute = Route as unknown as RouteLike;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const buildService = (overrides?: Partial<Service>): Service => ({
  slug: "income-assistance",
  name: "Income Assistance",
  description: { short: "Temporary financial support." },
  applications: [],
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ServiceSlug Index Route Test", () => {
  beforeAll(() => {
    if (!globalThis.IntersectionObserver) {
      globalThis.IntersectionObserver = class {
        observe = jest.fn();
        disconnect = jest.fn();
        unobserve = jest.fn();
        takeRecords = jest.fn(() => []);
        readonly root = null;
        readonly rootMargin = "";
        readonly thresholds = [];
      } as unknown as typeof IntersectionObserver;
    }
  });

  beforeEach(() => {
    typedRoute.useLoaderData = mockRouteUseLoaderData;
    mockRouteUseLoaderData.mockReturnValue({ service: buildService() });
    // loader data and does not merge a second service source
    mockUseQuery.mockReturnValue({ data: undefined });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // ─── Route registration ─────────────────────────────────────────────────

  describe("Route registration", () => {
    it("Should register the route with the correct path", () => {
      const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

      expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
      expect(mockedCreateFileRoute).toHaveBeenCalledWith(
        "/app/services/$serviceSlug/",
      );
      expect(typedRoute.path).toBe("/app/services/$serviceSlug/");
      expect(typeof typedRoute.options.component).toBe("function");
      expect(typeof typedRoute.options.notFoundComponent).toBe("function");
    });
  });

  // ─── Loader ─────────────────────────────────────────────────────────────

  describe("loader", () => {
    it("Should return the matching service from query data", async () => {
      const service = buildService();
      mockedEnsureQueryData.mockResolvedValueOnce([service]);

      const result = await typedRoute.options.loader({
        params: { serviceSlug: "income-assistance" },
      });

      expect(mockedEnsureQueryData).toHaveBeenCalledWith(
        mockServicesQueryOptions,
      );
      expect(result).toEqual({ service });
    });

    it("Should throw notFound when service slug does not match", async () => {
      mockedEnsureQueryData.mockResolvedValueOnce([]);

      await expect(
        typedRoute.options.loader({ params: { serviceSlug: "unknown" } }),
      ).rejects.toEqual({ type: "not-found" });

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Breadcrumbs ────────────────────────────────────────────────────────

  describe("staticData.breadcrumbs", () => {
    it("Should include the service name label when loader data is present", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        service: { name: "Income Assistance" },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        { label: "Income Assistance" },
      ]);
    });

    it("Should omit the service label when loader data is missing", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs(undefined);

      expect(breadcrumbs).toEqual([{ label: "Services", to: "/app/services" }]);
    });
  });

  // ─── RouteComponent ─────────────────────────────────────────────────────

  describe("RouteComponent", () => {
    const RouteComponent = () => {
      const Component = typedRoute.options.component;
      return <Component />;
    };

    it("Should render the service name heading", () => {
      render(<RouteComponent />);
      expect(
        screen.getByRole("heading", { name: "Income Assistance" }),
      ).toBeInTheDocument();
    });

    it("Should render the service short description", () => {
      render(<RouteComponent />);
      expect(
        screen.getByText("Temporary financial support."),
      ).toBeInTheDocument();
    });

    it("Should render ServicePageNavigation with the service name", () => {
      render(<RouteComponent />);
      const nav = screen.getByTestId("service-page-navigation");
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute("data-service-name", "Income Assistance");
      expect(nav).toHaveAttribute("data-visible", "false");
    });

    it("Should render all section headings", () => {
      render(<RouteComponent />);

      expect(
        screen.getByRole("heading", { name: "About" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Data & privacy" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Eligibility criteria" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Application process" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Your activity" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "More information" }),
      ).toBeInTheDocument();
    });

    it("Should render sidebar accordions", () => {
      render(<RouteComponent />);

      expect(
        screen.getByTestId("resources-support-accordion"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("other-services-accordion"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("legal-information-accordion"),
      ).toBeInTheDocument();
    });

    it("Should render LexicalContent when service has content", () => {
      mockRouteUseLoaderData.mockReturnValue({
        service: buildService({ content: { root: {} } }),
      });
      mockUseQuery.mockReturnValue({ data: [] });

      render(<RouteComponent />);

      expect(screen.getByTestId("lexical-content")).toBeInTheDocument();
    });

    it("Should render a dropdown when the service has multiple applications", () => {
      const serviceWithMultipleApps = buildService({
        applications: [
          { id: "app-1", label: "Option A" },
          { id: "app-2", label: "Option B" },
        ],
      });
      mockRouteUseLoaderData.mockReturnValue({
        service: serviceWithMultipleApps,
      });
      mockUseQuery.mockReturnValue({ data: [serviceWithMultipleApps] });

      render(<RouteComponent />);

      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
    });

    it("Should use live service data from useQuery when it returns a matching entry", () => {
      const liveService = buildService({
        name: "Updated Service Name",
        description: { short: "Updated description." },
      });
      mockUseQuery.mockReturnValue({ data: [liveService] });

      render(<RouteComponent />);

      expect(
        screen.getByRole("heading", { name: "Updated Service Name" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Updated description.")).toBeInTheDocument();
    });

    it("Should toggle sticky header visibility via IntersectionObserver", () => {
      let observerCallback: IntersectionObserverCallback | null = null;

      const mockObserve = jest.fn();
      const mockDisconnect = jest.fn();

      class MockIntersectionObserver {
        constructor(callback: IntersectionObserverCallback) {
          observerCallback = callback;
        }
        observe = mockObserve;
        disconnect = mockDisconnect;
        takeRecords = jest.fn(() => []);
        unobserve = jest.fn();
        readonly root = null;
        readonly rootMargin = "";
        readonly thresholds = [];
      }

      const OriginalIO = globalThis.IntersectionObserver;
      globalThis.IntersectionObserver =
        MockIntersectionObserver as unknown as typeof IntersectionObserver;

      render(<RouteComponent />);

      const nav = screen.getByTestId("service-page-navigation");
      expect(nav).toHaveAttribute("data-visible", "false");

      act(() => {
        observerCallback?.(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });

      expect(nav).toHaveAttribute("data-visible", "true");

      act(() => {
        observerCallback?.(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
      });

      expect(nav).toHaveAttribute("data-visible", "false");

      globalThis.IntersectionObserver = OriginalIO;
    });
  });

  // ─── NotFoundComponent ─────────────────────────────────────────────────

  describe("NotFoundComponent", () => {
    it("Should render the not found heading and back link", () => {
      const NotFoundComponent = typedRoute.options.notFoundComponent;
      render(<NotFoundComponent />);

      expect(
        screen.getByRole("heading", { name: "Service not found" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("The service you're looking for doesn't exist."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Back to services" }),
      ).toBeInTheDocument();
    });
  });

  // ─── ConsentDocumentsAccordion ──────────────────────────────────────────

  describe("ConsentDocumentsAccordion", () => {
    it("Should not render when consent documents are empty", () => {
      mockRouteUseLoaderData.mockReturnValue({
        service: buildService({ settings: { consent: [] } }),
      });
      mockUseQuery.mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);

      expect(screen.queryByTestId("accordion-group")).not.toBeInTheDocument();
    });

    it("Should render accordion when consent documents are returned", () => {
      mockRouteUseLoaderData.mockReturnValue({
        service: buildService({
          settings: { consent: [{ documentId: "doc-1" }] },
        }),
      });
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-documents") {
          return {
            data: [{ id: "doc-1", name: "Privacy Policy", content: null }],
          };
        }
        return { data: [] };
      });

      render(<typedRoute.options.component />);

      expect(screen.getByTestId("accordion-group")).toBeInTheDocument();
      expect(screen.getByTestId("accordion-trigger")).toHaveTextContent(
        "Privacy Policy",
      );
      expect(screen.getByText("No content available.")).toBeInTheDocument();
    });

    it("Should render LexicalContent inside accordion when document has content", () => {
      mockRouteUseLoaderData.mockReturnValue({
        service: buildService({
          settings: { consent: [{ documentId: "doc-1" }] },
        }),
      });
      mockUseQuery.mockImplementation((opts: { queryKey: string[] }) => {
        if (opts.queryKey[0] === "consent-documents") {
          return {
            data: [
              { id: "doc-1", name: "Privacy Policy", content: { root: {} } },
            ],
          };
        }
        return { data: [] };
      });

      render(<typedRoute.options.component />);

      expect(screen.getByTestId("lexical-content")).toBeInTheDocument();
    });
  });
});
