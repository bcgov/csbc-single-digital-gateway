import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { mockedEnsureQueryData } from "tests/utils/mocks/tankstack/mock.ensureQueryData";
import { mockUseQuery } from "tests/utils/mocks/tankstack/mock.useQuery";
import type {
  Application,
  Params,
  RouteLike,
  Service,
} from "tests/utils/types/app/routes/routes.type";

// ─── Shared mocks ────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockUseNavigate = jest.fn(() => mockNavigate);
const mockRouteUseLoaderData = jest.fn();
const mockRouteUseParams = jest.fn();
const mockRedirect = jest.fn((value: unknown) => ({
  type: "redirect",
  ...(value as object),
}));
const mockNotFound = jest.fn(() => ({ type: "not-found" }));
const mockToastError = jest.fn();

const mockSubmitApplication = jest.fn();

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
      useLoaderData: mockRouteUseLoaderData,
      useParams: mockRouteUseParams,
    });
  }),
  notFound: () => mockNotFound(),
  redirect: (...args: unknown[]) => mockRedirect(...(args as [unknown])),
  useNavigate: () => mockUseNavigate(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock("src/features/services/data/applications.mutation", () => ({
  submitApplication: (...args: unknown[]) => mockSubmitApplication(...args),
}));

jest.mock(
  "src/features/services/components/starting-application-loader.component",
  () => ({
    StartingApplicationLoader: ({ message }: { message?: string }) => (
      <div data-testid="starting-application-loader" data-message={message} />
    ),
  }),
);

jest.mock("src/features/services/data/services.query", () => ({
  serviceQueryOptions: jest.fn((id: string) => ({
    queryKey: ["services", id],
  })),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/services/$serviceId/apply/$applicationId/index";

// ─── Types ───────────────────────────────────────────────────────────────────

const typedRoute = Route as unknown as RouteLike;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SERVICE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const APPLICATION_ID = "b2c3d4e5-f6a7-8901-bcde-f23456789012";
const VERSION_ID = "c3d4e5f6-a7b8-9012-cdef-345678901234";
const NEW_ROW_ID = "d4e5f6a7-b8c9-0123-defa-456789012345";

const params: Params = {
  serviceId: SERVICE_ID,
  applicationId: APPLICATION_ID,
};

const buildApplication = (overrides?: Partial<Application>): Application => ({
  id: APPLICATION_ID,
  type: "external",
  label: "Income Support Application",
  ...overrides,
});

const buildService = (overrides?: Partial<Service>): Service =>
  ({
    id: SERVICE_ID,
    versionId: VERSION_ID,
    name: "Income Assistance",
    content: { applications: [buildApplication()] },
    ...overrides,
  }) as Service;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ApplicationId Index Route (apply loader) Test", () => {
  beforeEach(() => {
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseQuery.mockReturnValue({ data: undefined });
    mockRouteUseLoaderData.mockReturnValue({
      service: buildService(),
      application: buildApplication(),
    });
    mockRouteUseParams.mockReturnValue(params);
    typedRoute.useLoaderData = mockRouteUseLoaderData;
    typedRoute.useParams = mockRouteUseParams;
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
        "/app/services/$serviceId/apply/$applicationId/",
      );
      expect(typedRoute.path).toBe(
        "/app/services/$serviceId/apply/$applicationId/",
      );
      expect(typeof typedRoute.options.component).toBe("function");
    });
  });

  // ─── beforeLoad ──────────────────────────────────────────────────────────

  describe("beforeLoad", () => {
    it("Should pass through when service has no consent documents", async () => {
      await expect(
        typedRoute.options.beforeLoad({ params }),
      ).resolves.toBeUndefined();

      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  // ─── loader ──────────────────────────────────────────────────────────────

  describe("loader", () => {
    it("Should return service and application", async () => {
      const service = buildService();
      mockedEnsureQueryData.mockResolvedValueOnce(service);

      const result = await typedRoute.options.loader({ params });

      expect(mockedEnsureQueryData).toHaveBeenCalledWith({
        queryKey: ["services", SERVICE_ID],
      });
      expect(result).toEqual({
        service,
        application: buildApplication(),
      });
    });

    it("Should throw notFound when the service request returns 404", async () => {
      mockedEnsureQueryData.mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
      });

      await expect(typedRoute.options.loader({ params })).rejects.toEqual({
        type: "not-found",
      });

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it("Should throw notFound when application does not exist on service", async () => {
      mockedEnsureQueryData.mockResolvedValueOnce(
        buildService({ content: { applications: [{ id: "other-app" }] } }),
      );

      await expect(typedRoute.options.loader({ params })).rejects.toEqual({
        type: "not-found",
      });

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });
  });

  // ─── staticData.breadcrumbs ───────────────────────────────────────────────

  describe("staticData.breadcrumbs", () => {
    it("Should build breadcrumbs with service and application labels", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        service: { name: "Income Assistance", id: SERVICE_ID },
        application: { label: "Income Support Application" },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        {
          label: "Income Assistance",
          to: "/app/services/$serviceId",
          params: { serviceId: SERVICE_ID },
        },
        { label: "Apply for Income Support Application" },
      ]);
    });

    it("Should build breadcrumbs with service only when application is missing", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        service: { name: "Income Assistance", id: SERVICE_ID },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        {
          label: "Income Assistance",
          to: "/app/services/$serviceId",
          params: { serviceId: SERVICE_ID },
        },
      ]);
    });

    it("Should build breadcrumbs with services only when loader data is missing", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs(undefined);

      expect(breadcrumbs).toEqual([{ label: "Services", to: "/app/services" }]);
    });
  });

  // ─── RouteComponent ───────────────────────────────────────────────────────

  describe("RouteComponent", () => {
    it("Should render the StartingApplicationLoader while the request is in flight", () => {
      // Return a promise that never resolves so the component stays in the pending state.
      mockSubmitApplication.mockReturnValueOnce(new Promise(() => {}));

      render(<typedRoute.options.component />);

      expect(
        screen.getByTestId("starting-application-loader"),
      ).toBeInTheDocument();
    });

    it("Should call submitApplication once on mount with the service, version, and application ids", () => {
      mockSubmitApplication.mockReturnValueOnce(new Promise(() => {}));

      render(<typedRoute.options.component />);

      expect(mockSubmitApplication).toHaveBeenCalledTimes(1);
      expect(mockSubmitApplication).toHaveBeenCalledWith({
        serviceId: SERVICE_ID,
        versionId: VERSION_ID,
        applicationId: APPLICATION_ID,
      });
    });

    it("Should navigate to the new applications/<row id> route with replace:true on resolution", async () => {
      mockSubmitApplication.mockResolvedValueOnce({ id: NEW_ROW_ID });

      render(<typedRoute.options.component />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/app/services/$serviceId/applications/$applicationId",
          params: { serviceId: SERVICE_ID, applicationId: NEW_ROW_ID },
          replace: true,
        });
      });
    });

    it("Should toast an error and navigate back to the service detail on rejection", async () => {
      mockSubmitApplication.mockRejectedValueOnce(
        new Error("workflow engine unavailable"),
      );

      render(<typedRoute.options.component />);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "We couldn't start your application.",
          expect.objectContaining({
            description: "workflow engine unavailable",
          }),
        );
      });
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/app/services/$serviceId",
        params: { serviceId: SERVICE_ID },
        replace: true,
      });
    });

    it("Should short-circuit with a toast and redirect when service.versionId is null", () => {
      mockRouteUseLoaderData.mockReturnValue({
        service: buildService({ versionId: null } as Partial<Service>),
        application: buildApplication(),
      });

      render(<typedRoute.options.component />);

      expect(mockSubmitApplication).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith(
        "We couldn't start your application.",
        expect.objectContaining({
          description: "This service is not currently accepting applications.",
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/app/services/$serviceId",
        params: { serviceId: SERVICE_ID },
        replace: true,
      });
    });

    it("Should fall back to a generic description when the rejection is not an Error instance", async () => {
      mockSubmitApplication.mockRejectedValueOnce("string error");

      render(<typedRoute.options.component />);

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          "We couldn't start your application.",
          expect.objectContaining({ description: "Please try again." }),
        );
      });
    });
  });
});
