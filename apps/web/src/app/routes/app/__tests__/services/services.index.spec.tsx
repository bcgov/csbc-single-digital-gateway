import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { mockedEnsureQueryData } from "tests/utils/mocks/tankstack/mock.ensureQueryData";
import {
  mockedUseQueryActual,
  mockUseQueryForActual as mockUseQuery,
} from "tests/utils/mocks/tankstack/mock.useQueryActual";
import type {
  RouteLike,
  Service,
} from "tests/utils/types/app/routes/routes.type";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: Record<string, unknown>) => ({
      id: path,
      path,
      options: config,
    });
  }),
  Link: ({
    children,
    to,
    params,
  }: {
    children?: ReactNode;
    to: string;
    params?: { serviceSlug?: string };
  }) => {
    const href =
      params?.serviceSlug && to.includes("$serviceSlug")
        ? to.replace("$serviceSlug", params.serviceSlug)
        : to;
    return (
      <a href={href} data-testid="service-link">
        {children}
      </a>
    );
  },
}));

jest.mock("@repo/ui", () => ({
  Badge: ({ children }: { children?: ReactNode }) => (
    <span data-testid="badge">{children}</span>
  ),
  Card: ({ children }: { children?: ReactNode }) => (
    <article data-testid="card">{children}</article>
  ),
  CardHeader: ({ children }: { children?: ReactNode }) => (
    <header>{children}</header>
  ),
  CardTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  CardAction: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("src/features/services/data/services.query", () => ({
  servicesQueryOptions: { queryKey: ["services"] },
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/services/index";

const { servicesQueryOptions: mockServicesQueryOptions } = jest.requireMock(
  "src/features/services/data/services.query",
) as { servicesQueryOptions: { queryKey: string[] } };

const typedRoute = Route as unknown as RouteLike;
const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

describe("Services Index Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    mockUseQuery.mockReset();
  });

  it('Should register route with path "/app/services/"', () => {
    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/app/services/");
    expect(typedRoute.path).toBe("/app/services/");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should call loader with servicesQueryOptions", async () => {
    const services: Service[] = [{ slug: "income", name: "Income Assistance" }];
    mockedEnsureQueryData.mockResolvedValueOnce(services);

    const result = await typedRoute.options.loader({ params: {} });

    expect(mockedEnsureQueryData).toHaveBeenCalledTimes(1);
    expect(mockedEnsureQueryData).toHaveBeenCalledWith(
      mockServicesQueryOptions,
    );
    expect(result).toEqual(services);
  });

  it('Should render "Services" heading', () => {
    mockedUseQueryActual.mockReturnValue({ data: [] });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(
      screen.getByRole("heading", { name: "Services" }),
    ).toBeInTheDocument();
  });

  it("Should render no service links when service list is empty", () => {
    mockedUseQueryActual.mockReturnValue({ data: [] });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.queryAllByTestId("service-link")).toHaveLength(0);
  });

  it("Should render service cards, links, names, and descriptions", () => {
    const services: Service[] = [
      {
        slug: "income-assistance",
        name: "Income Assistance",
        description: { short: "Temporary financial support." },
      },
      {
        slug: "housing-support",
        name: "Housing Support",
        description: { short: "Housing stabilization support." },
      },
    ];
    mockedUseQueryActual.mockReturnValue({ data: services });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.getByText("Income Assistance")).toBeInTheDocument();
    expect(screen.getByText("Housing Support")).toBeInTheDocument();
    expect(
      screen.getByText("Temporary financial support."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Housing stabilization support."),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /income assistance/i }),
    ).toHaveAttribute("href", "/app/services/income-assistance");
    expect(
      screen.getByRole("link", { name: /housing support/i }),
    ).toHaveAttribute("href", "/app/services/housing-support");
  });

  it("Should render category badges with capitalized labels", () => {
    const services: Service[] = [
      {
        slug: "income-assistance",
        name: "Income Assistance",
        categories: ["health", "employment"],
        description: { short: "Temporary financial support." },
      },
    ];
    mockedUseQueryActual.mockReturnValue({ data: services });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("Employment")).toBeInTheDocument();
    expect(screen.getAllByTestId("badge")).toHaveLength(2);
  });

  it("Should not render badges when categories are missing", () => {
    const services: Service[] = [
      {
        slug: "income-assistance",
        name: "Income Assistance",
        description: { short: "Temporary financial support." },
      },
    ];
    mockedUseQueryActual.mockReturnValue({ data: services });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.queryAllByTestId("badge")).toHaveLength(0);
  });
});
