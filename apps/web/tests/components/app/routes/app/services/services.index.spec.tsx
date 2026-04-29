import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { mockedEnsureQueryData } from "tests/utils/mocks/tankstack/mock.ensureQueryData";
import {
  mockUseQueryForActual as mockUseQuery,
  mockedUseQueryActual as mockedUseQuery
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
    params?: { serviceId?: string };
  }) => {
    const href =
      params?.serviceId && to.includes("$serviceId")
        ? to.replace("$serviceId", params.serviceId)
        : to;
    return (
      <a href={href} data-testid="service-link">
        {children}
      </a>
    );
  },
}));

jest.mock("@repo/ui", () => ({
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
    const services: Service[] = [{ id: "svc-1", name: "Income Assistance" }];
    mockedEnsureQueryData.mockResolvedValueOnce(services);

    const result = await typedRoute.options.loader({ params: {} });

    expect(mockedEnsureQueryData).toHaveBeenCalledTimes(1);
    expect(mockedEnsureQueryData).toHaveBeenCalledWith(
      mockServicesQueryOptions,
    );
    expect(result).toEqual(services);
  });

  it('Should render "Services" heading', () => {
    mockedUseQuery.mockReturnValue({ data: [] });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(
      screen.getByRole("heading", { name: "Services" }),
    ).toBeInTheDocument();
  });

  it("Should render no service links when service list is empty", () => {
    mockedUseQuery.mockReturnValue({ data: [] });

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.queryAllByTestId("service-link")).toHaveLength(0);
  });

  it("Should render service cards, links, names, and descriptions", () => {
    const services: Service[] = [
      {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        name: "Income Assistance",
        description: "Temporary financial support.",
      },
      {
        id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        name: "Housing Support",
        description: "Housing stabilization support.",
      },
    ];
    mockedUseQuery.mockReturnValue({ data: services });

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
    ).toHaveAttribute("href", "/app/services/a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(
      screen.getByRole("link", { name: /housing support/i }),
    ).toHaveAttribute("href", "/app/services/b2c3d4e5-f6a7-8901-bcde-f12345678901");
  });
});
