import { cleanup, render, screen } from "@testing-library/react";
import type { ServiceDto } from "src/features/services/service.dto";

const mockUseBcscAuth = jest.fn();
const mockUseQuery = jest.fn();

jest.mock("src/features/auth/auth.context", () => ({
  useBcscAuth: (...args: unknown[]) => mockUseBcscAuth(...args),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock("src/features/services/data/applications.query", () => ({
  applicationsForServiceQueryOptions: jest.fn((vars: unknown) => ({
    queryKey: ["applications-query-options", vars],
    queryFn: jest.fn(),
  })),
}));

jest.mock(
  "src/features/services/components/start-application-type-button.component",
  () => ({
    StartApplicationTypeButton: ({
      serviceId,
      applicationType,
    }: {
      serviceId: string;
      applicationType: { id: string; label: string };
    }) => (
      <div
        data-testid="start-type-button"
        data-service-id={serviceId}
        data-type-id={applicationType.id}
        data-type-label={applicationType.label}
      />
    ),
  }),
);

jest.mock(
  "src/features/services/components/resume-application-button.component",
  () => ({
    ResumeApplicationButton: ({
      serviceId,
      applicationType,
      applications,
    }: {
      serviceId: string;
      applicationType: { id: string };
      applications: { id: string }[];
    }) => (
      <div
        data-testid="resume-button"
        data-service-id={serviceId}
        data-type-id={applicationType.id}
        data-app-count={applications.length}
        data-app-ids={applications.map((a) => a.id).join(",")}
      />
    ),
  }),
);

import { ServiceApplicationCta } from "src/features/services/components/service-application-cta.component";

const SERVICE_ID = "svc-1";
const TYPE_A = "type-a";
const TYPE_B = "type-b";

const makeAuth = (isAuthenticated: boolean) => ({
  isAuthenticated,
  isLoading: false,
  user: isAuthenticated ? { sub: "abc" } : null,
  login: jest.fn(),
  logout: jest.fn(),
});

const buildService = (
  applications: { id: string; type: string; label: string }[],
): ServiceDto =>
  ({
    id: SERVICE_ID,
    name: "Test Service",
    content: { applications },
    createdAt: "2026-04-22T12:00:00Z",
    updatedAt: "2026-04-22T12:00:00Z",
  }) as unknown as ServiceDto;

const buildApp = (id: string, serviceApplicationId: string) => ({
  id,
  serviceId: SERVICE_ID,
  serviceApplicationId,
  serviceApplicationTitle: "Tax return",
  createdAt: "2026-04-22T12:00:00Z",
  updatedAt: "2026-04-22T12:00:00Z",
});

describe("ServiceApplicationCta", () => {
  beforeEach(() => {
    mockUseBcscAuth.mockReset();
    mockUseQuery.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render nothing when the service has no application types", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(false));
    mockUseQuery.mockReturnValue({ data: undefined });

    const { container } = render(
      <ServiceApplicationCta service={buildService([])} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("Should pass enabled: false through to useQuery when the user is unauthenticated", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(false));
    mockUseQuery.mockReturnValue({ data: undefined });

    render(
      <ServiceApplicationCta
        service={buildService([
          { id: TYPE_A, type: "workflow", label: "Apply online" },
        ])}
      />,
    );

    const queryArg = mockUseQuery.mock.calls[0][0];
    expect(queryArg.enabled).toBe(false);
  });

  it("Should render StartApplicationTypeButton for each application type when the user is unauthenticated", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(false));
    mockUseQuery.mockReturnValue({ data: undefined });

    render(
      <ServiceApplicationCta
        service={buildService([
          { id: TYPE_A, type: "workflow", label: "Apply online" },
          { id: TYPE_B, type: "external", label: "Apply by mail" },
        ])}
      />,
    );

    const buttons = screen.getAllByTestId("start-type-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute("data-type-id", TYPE_A);
    expect(buttons[1]).toHaveAttribute("data-type-id", TYPE_B);
    expect(screen.queryByTestId("resume-button")).not.toBeInTheDocument();
  });

  it("Should render StartApplicationTypeButton per type when the user is authenticated but has no applications", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: { items: [], total: 0, page: 1, limit: 5 },
    });

    render(
      <ServiceApplicationCta
        service={buildService([
          { id: TYPE_A, type: "workflow", label: "Apply online" },
        ])}
      />,
    );

    expect(screen.getByTestId("start-type-button")).toBeInTheDocument();
    expect(screen.queryByTestId("resume-button")).not.toBeInTheDocument();
  });

  it("Should render StartApplicationTypeButton per type while the applications query is still pending (data undefined)", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({ data: undefined });

    render(
      <ServiceApplicationCta
        service={buildService([
          { id: TYPE_A, type: "workflow", label: "Apply online" },
          { id: TYPE_B, type: "external", label: "Apply by mail" },
        ])}
      />,
    );

    expect(screen.getAllByTestId("start-type-button")).toHaveLength(2);
    expect(screen.queryByTestId("resume-button")).not.toBeInTheDocument();
  });

  it("Should render ResumeApplicationButton for a type when the user has at least one matching application, and StartApplicationTypeButton for types with none", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: {
        items: [buildApp("app-a1", TYPE_A)],
        total: 1,
        page: 1,
        limit: 5,
      },
    });

    render(
      <ServiceApplicationCta
        service={buildService([
          { id: TYPE_A, type: "workflow", label: "Apply online" },
          { id: TYPE_B, type: "external", label: "Apply by mail" },
        ])}
      />,
    );

    const resumes = screen.getAllByTestId("resume-button");
    expect(resumes).toHaveLength(1);
    expect(resumes[0]).toHaveAttribute("data-type-id", TYPE_A);
    expect(resumes[0]).toHaveAttribute("data-app-count", "1");

    const starts = screen.getAllByTestId("start-type-button");
    expect(starts).toHaveLength(1);
    expect(starts[0]).toHaveAttribute("data-type-id", TYPE_B);
  });

  it("Should filter applications by serviceApplicationId so a type with no matches still renders StartApplicationTypeButton", () => {
    mockUseBcscAuth.mockReturnValue(makeAuth(true));
    mockUseQuery.mockReturnValue({
      data: {
        items: [
          buildApp("app-a1", TYPE_A),
          buildApp("app-a2", TYPE_A),
        ],
        total: 2,
        page: 1,
        limit: 5,
      },
    });

    render(
      <ServiceApplicationCta
        service={buildService([
          { id: TYPE_A, type: "workflow", label: "Apply online" },
          { id: TYPE_B, type: "external", label: "Apply by mail" },
        ])}
      />,
    );

    const resume = screen.getByTestId("resume-button");
    expect(resume).toHaveAttribute("data-type-id", TYPE_A);
    expect(resume).toHaveAttribute("data-app-count", "2");
    expect(resume).toHaveAttribute("data-app-ids", "app-a1,app-a2");

    const start = screen.getByTestId("start-type-button");
    expect(start).toHaveAttribute("data-type-id", TYPE_B);
  });
});
