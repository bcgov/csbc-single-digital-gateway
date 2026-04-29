import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { mockUseQueryForActual as mockUseQuery } from "tests/utils/mocks/tankstack/mock.useQueryActual";

const mockNavigate = jest.fn();
const mockRouteUseSearch = jest.fn();
const mockConsentTimelineQueryOptions = jest.fn((search) => ({
  queryKey: ["consent-timeline", search],
}));

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: Record<string, unknown>) => ({
      id: path,
      path,
      options: config,
      useSearch: mockRouteUseSearch,
    });
  }),
  useNavigate: jest.fn(() => mockNavigate),
}));

jest.mock("@repo/ui", () => ({
  InputGroup: ({ children }: { children?: ReactNode }) => (
    <div data-testid="input-group">{children}</div>
  ),
  InputGroupAddon: ({
    children,
    align,
  }: {
    children?: ReactNode;
    align?: string;
  }) => (
    <div data-testid="input-group-addon" data-align={align}>
      {children}
    </div>
  ),
  InputGroupInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <input
      data-testid="input-group-input"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange?.(event)}
    />
  ),
  Pagination: ({ children }: { children?: ReactNode }) => (
    <nav data-testid="pagination">{children}</nav>
  ),
  PaginationContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="pagination-content">{children}</div>
  ),
  PaginationItem: ({ children }: { children?: ReactNode }) => (
    <div data-testid="pagination-item">{children}</div>
  ),
  PaginationLink: ({
    children,
    onClick,
    isActive,
    className,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    isActive?: boolean;
    className?: string;
  }) => (
    <button
      type="button"
      data-testid="pagination-link"
      data-active={String(Boolean(isActive))}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  PaginationPrevious: ({
    onClick,
    className,
    ...props
  }: {
    onClick?: () => void;
    className?: string;
    "aria-disabled"?: boolean;
  }) => (
    <button
      type="button"
      data-testid="pagination-previous"
      className={className}
      onClick={onClick}
      {...props}
    >
      Previous
    </button>
  ),
  PaginationNext: ({
    onClick,
    className,
    ...props
  }: {
    onClick?: () => void;
    className?: string;
    "aria-disabled"?: boolean;
  }) => (
    <button
      type="button"
      data-testid="pagination-next"
      className={className}
      onClick={onClick}
      {...props}
    >
      Next
    </button>
  ),
  Separator: ({ className }: { className?: string }) => (
    <hr data-testid="separator" className={className} />
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconSearch: ({ className }: { className?: string }) => (
    <svg data-testid="icon-search" className={className} />
  ),
}));

jest.mock(
  "src/features/consent-history/components/consent-history-filters.component",
  () => ({
    ConsentHistoryFilters: ({
      documentType,
      status,
      from,
      to,
    }: {
      documentType?: string[];
      status?: string[];
      from?: string;
      to?: string;
    }) => (
      <div
        data-testid="consent-history-filters"
        data-document-type={JSON.stringify(documentType ?? [])}
        data-status={JSON.stringify(status ?? [])}
        data-from={from ?? ""}
        data-to={to ?? ""}
      />
    ),
  }),
);

jest.mock(
  "src/features/consent-history/components/consent-timeline.component",
  () => ({
    ConsentTimeline: ({
      groups,
    }: {
      groups?: Array<{ id: string; label?: string }>;
    }) => (
      <div data-testid="consent-timeline" data-count={groups?.length ?? 0}>
        {(groups ?? []).map((group) => (
          <div key={group.id}>{group.label ?? group.id}</div>
        ))}
      </div>
    ),
  }),
);

jest.mock("src/features/consent-history/data/consent-timeline.query", () => ({
  consentTimelineQueryOptions: (search: SearchShape) =>
    mockConsentTimelineQueryOptions(search),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/settings/consent-history/index";

type SearchShape = {
  search?: string;
  documentType?: string[];
  status?: string[];
  from?: string;
  to?: string;
  page?: number;
};

type TimelineGroup = {
  id: string;
  label?: string;
};

type TimelineData = {
  data: TimelineGroup[];
  totalPages: number;
  page: number;
};

type RouteLike = {
  path: string;
  options: {
    validateSearch: (search: unknown) => SearchShape;
    staticData: {
      breadcrumbs: () => Array<Record<string, unknown>>;
    };
    component: ComponentType;
  };
  useSearch: () => SearchShape;
};

const typedRoute = Route as unknown as RouteLike;
const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;
const mockedUseNavigate = useNavigate as unknown as jest.Mock;
const mockedConsentTimelineQueryOptions = mockConsentTimelineQueryOptions;

const buildSearch = (overrides?: Partial<SearchShape>): SearchShape => ({
  search: undefined,
  documentType: undefined,
  status: undefined,
  from: undefined,
  to: undefined,
  page: undefined,
  ...overrides,
});

const buildTimelineData = (
  overrides?: Partial<TimelineData>,
): TimelineData => ({
  data: [],
  totalPages: 1,
  page: 1,
  ...overrides,
});

describe("ConsentHistory Route Test", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    typedRoute.useSearch = mockRouteUseSearch;
    mockRouteUseSearch.mockReturnValue(buildSearch());
    mockUseQuery.mockReturnValue({
      data: buildTimelineData(),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it('Should register the route with path "/app/settings/consent-history/"', () => {
      expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
      expect(mockedCreateFileRoute).toHaveBeenCalledWith(
        "/app/settings/consent-history/",
      );
      expect(typedRoute.path).toBe("/app/settings/consent-history/");
      expect(typeof typedRoute.options.component).toBe("function");
    });
  });

  describe("validateSearch", () => {
    it("Should return valid search values unchanged", () => {
      const result = typedRoute.options.validateSearch({
        search: "privacy",
        documentType: ["policy", "program"],
        status: ["active"],
        from: "2024-01-01",
        to: "2024-12-31",
        page: 2,
      });

      expect(result).toEqual({
        search: "privacy",
        documentType: ["policy", "program"],
        status: ["active"],
        from: "2024-01-01",
        to: "2024-12-31",
        page: 2,
      });
    });

    it("Should coerce invalid search values to undefined", () => {
      const result = typedRoute.options.validateSearch({
        search: 123,
        documentType: "policy",
        status: [1],
        from: 999,
        to: null,
        page: "3",
      });

      expect(result).toEqual({
        search: undefined,
        documentType: undefined,
        status: undefined,
        from: undefined,
        to: undefined,
        page: undefined,
      });
    });
  });

  describe("staticData.breadcrumbs", () => {
    it("Should return the expected breadcrumbs", () => {
      expect(typedRoute.options.staticData.breadcrumbs()).toEqual([
        { label: "Settings", to: "/app/settings" },
        { label: "Consent history" },
      ]);
    });
  });

  describe("ConsentHistoryPage", () => {
    const renderRouteComponent = () => {
      const Component = typedRoute.options.component;
      return render(<Component />);
    };

    it("Should render heading, description, search icon, and initial search value", () => {
      mockRouteUseSearch.mockReturnValue(
        buildSearch({ search: "benefit search" }),
      );

      renderRouteComponent();

      expect(
        screen.getByRole("heading", { name: "Consent history" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Review your current and past consents for services."),
      ).toBeInTheDocument();
      expect(screen.getByTestId("icon-search")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search consents...")).toHaveValue(
        "benefit search",
      );
      expect(mockedUseNavigate).toHaveBeenCalledWith({
        from: "/app/settings/consent-history",
      });
    });

    it("Should call consentTimelineQueryOptions with route search filters", () => {
      mockRouteUseSearch.mockReturnValue(
        buildSearch({
          search: "privacy",
          documentType: ["policy"],
          status: ["active"],
          from: "2024-01-01",
          to: "2024-01-31",
          page: 3,
        }),
      );

      renderRouteComponent();

      expect(mockedConsentTimelineQueryOptions).toHaveBeenCalledWith({
        search: "privacy",
        documentType: ["policy"],
        status: ["active"],
        from: "2024-01-01",
        to: "2024-01-31",
        page: 3,
      });
      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: [
          "consent-timeline",
          {
            search: "privacy",
            documentType: ["policy"],
            status: ["active"],
            from: "2024-01-01",
            to: "2024-01-31",
            page: 3,
          },
        ],
      });
    });

    it("Should pass query groups to ConsentTimeline", () => {
      mockUseQuery.mockReturnValue({
        data: buildTimelineData({
          data: [
            { id: "group-1", label: "Privacy Policy" },
            { id: "group-2", label: "Terms of Use" },
          ],
        }),
      });

      renderRouteComponent();

      expect(screen.getByTestId("consent-timeline")).toHaveAttribute(
        "data-count",
        "2",
      );
      expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
      expect(screen.getByText("Terms of Use")).toBeInTheDocument();
    });

    it("Should pass filter values to ConsentHistoryFilters", () => {
      mockRouteUseSearch.mockReturnValue(
        buildSearch({
          documentType: ["policy", "program"],
          status: ["active", "expired"],
          from: "2024-01-01",
          to: "2024-02-01",
        }),
      );

      renderRouteComponent();

      const filters = screen.getByTestId("consent-history-filters");
      expect(filters).toHaveAttribute(
        "data-document-type",
        JSON.stringify(["policy", "program"]),
      );
      expect(filters).toHaveAttribute(
        "data-status",
        JSON.stringify(["active", "expired"]),
      );
      expect(filters).toHaveAttribute("data-from", "2024-01-01");
      expect(filters).toHaveAttribute("data-to", "2024-02-01");
    });

    it("Should render the gold separator", () => {
      renderRouteComponent();

      expect(screen.getByTestId("separator")).toHaveClass("bg-bcgov-gold");
    });

    it("Should not render pagination when there is only one page", () => {
      mockUseQuery.mockReturnValue({
        data: buildTimelineData({
          data: [{ id: "group-1", label: "Privacy Policy" }],
          totalPages: 1,
          page: 1,
        }),
      });

      renderRouteComponent();

      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });

    it("Should render pagination when there are multiple pages", () => {
      mockUseQuery.mockReturnValue({
        data: buildTimelineData({
          data: [{ id: "group-1", label: "Privacy Policy" }],
          totalPages: 3,
          page: 2,
        }),
      });

      renderRouteComponent();

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
        "data-active",
        "true",
      );
    });

    it("Should disable previous button on the first page", () => {
      mockUseQuery.mockReturnValue({
        data: buildTimelineData({
          totalPages: 3,
          page: 1,
        }),
      });

      renderRouteComponent();

      expect(screen.getByTestId("pagination-previous")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByTestId("pagination-previous")).toHaveClass(
        "pointer-events-none",
        "opacity-50",
      );
    });

    it("Should disable next button on the last page", () => {
      mockUseQuery.mockReturnValue({
        data: buildTimelineData({
          totalPages: 3,
          page: 3,
        }),
      });

      renderRouteComponent();

      expect(screen.getByTestId("pagination-next")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByTestId("pagination-next")).toHaveClass(
        "pointer-events-none",
        "opacity-50",
      );
    });

    it("Should navigate to the selected page when a pagination link is clicked", () => {
      mockRouteUseSearch.mockReturnValue(
        buildSearch({
          search: "privacy",
          status: ["active"],
          page: 2,
        }),
      );
      mockUseQuery.mockReturnValue({
        data: buildTimelineData({
          totalPages: 3,
          page: 2,
        }),
      });

      renderRouteComponent();

      fireEvent.click(screen.getByRole("button", { name: "3" }));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const navigateArg = mockNavigate.mock.calls[0][0] as {
        replace: boolean;
        search: (prev: SearchShape) => SearchShape;
      };

      expect(navigateArg.replace).toBe(true);
      expect(
        navigateArg.search({
          search: "privacy",
          status: ["active"],
          page: 2,
        }),
      ).toEqual({
        search: "privacy",
        status: ["active"],
        page: 3,
      });
    });
  });
});
