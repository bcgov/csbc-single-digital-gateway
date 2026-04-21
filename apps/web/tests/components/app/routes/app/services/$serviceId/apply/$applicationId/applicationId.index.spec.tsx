import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
const mockToastSuccess = jest.fn();

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
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock("src/features/chefs", () => ({
  ChefsFormViewer: ({
    formId,
    onSubmissionComplete,
    onSubmissionError,
  }: {
    formId: string;
    onSubmissionComplete?: () => void;
    onSubmissionError?: (e: { message: string }) => void;
  }) => (
    <div data-testid="chefs-form-viewer" data-form-id={formId}>
      <button type="button" onClick={onSubmissionComplete}>
        Submit Chefs
      </button>
      <button
        type="button"
        onClick={() => onSubmissionError?.({ message: "chefs error" })}
      >
        Error Chefs
      </button>
    </div>
  ),
  WorkflowRenderer: ({
    application,
    onSubmissionComplete,
    onSubmissionError,
  }: {
    application: { id: string };
    onSubmissionComplete?: () => void;
    onSubmissionError?: (e: { message: string }) => void;
  }) => (
    <div data-testid="workflow-renderer" data-application-id={application.id}>
      <button type="button" onClick={onSubmissionComplete}>
        Submit Workflow
      </button>
      <button
        type="button"
        onClick={() => onSubmissionError?.({ message: "workflow error" })}
      >
        Error Workflow
      </button>
    </div>
  ),
}));

jest.mock(
  "src/features/services/components/invite-delegate-dialog.component",
  () => ({
    InviteDelegateDialog: () => <div data-testid="invite-delegate-dialog" />,
  }),
);

jest.mock("src/features/services/data/services.query", () => ({
  servicesQueryOptions: { queryKey: ["services"] },
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/services/$serviceId/apply/$applicationId/index";

const { servicesQueryOptions: mockServicesQueryOptions } = jest.requireMock(
  "src/features/services/data/services.query",
) as { servicesQueryOptions: { queryKey: string[] } };

// ─── Types ───────────────────────────────────────────────────────────────────

const typedRoute = Route as unknown as RouteLike;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const params: Params = {
  serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  applicationId: "app-1",
};

const buildApplication = (overrides?: Partial<Application>): Application => ({
  id: "app-1",
  type: "external",
  label: "Income Support Application",
  ...overrides,
});

const buildService = (overrides?: Partial<Service>): Service => ({
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "Income Assistance",
  content: { applications: [buildApplication()] },
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ApplicationId Index Route Test", () => {
  beforeEach(() => {
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseQuery.mockReturnValue({ data: [] });
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
      mockedEnsureQueryData.mockResolvedValueOnce([service]);

      const result = await typedRoute.options.loader({ params });

      expect(mockedEnsureQueryData).toHaveBeenCalledWith(
        mockServicesQueryOptions,
      );
      expect(result).toEqual({
        service,
        application: buildApplication(),
      });
    });

    it("Should throw notFound when service does not exist", async () => {
      mockedEnsureQueryData.mockResolvedValueOnce([]);

      await expect(typedRoute.options.loader({ params })).rejects.toEqual({
        type: "not-found",
      });

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    });

    it("Should throw notFound when application does not exist on service", async () => {
      mockedEnsureQueryData.mockResolvedValueOnce([
        buildService({ content: { applications: [{ id: "other-app" }] } }),
      ]);

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
        service: { name: "Income Assistance", id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        application: { label: "Income Support Application" },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        {
          label: "Income Assistance",
          to: "/app/services/$serviceId",
          params: { serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
        },
        { label: "Apply for Income Support Application" },
      ]);
    });

    it("Should build breadcrumbs with service only when application is missing", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        service: { name: "Income Assistance", id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        {
          label: "Income Assistance",
          to: "/app/services/$serviceId",
          params: { serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
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
    it("Should render application label as heading", () => {
      mockUseQuery.mockReturnValue({ data: [buildService()] });

      render(<typedRoute.options.component />);

      expect(
        screen.getByRole("heading", {
          name: "Income Support Application",
        }),
      ).toBeInTheDocument();
    });

    it("Should render InviteDelegateDialog", () => {
      mockUseQuery.mockReturnValue({ data: [buildService()] });

      render(<typedRoute.options.component />);

      expect(screen.getByTestId("invite-delegate-dialog")).toBeInTheDocument();
    });

    it("Should render ChefsFormViewer by default", () => {
      const service = buildService();
      mockUseQuery.mockReturnValue({ data: [service] });
      mockRouteUseLoaderData.mockReturnValue({
        service,
        application: buildApplication({
          blockType: "chefs",
          formId: "form-123",
        }),
      });

      render(<typedRoute.options.component />);

      expect(screen.getByTestId("chefs-form-viewer")).toBeInTheDocument();
      expect(screen.getByTestId("chefs-form-viewer")).toHaveAttribute(
        "data-form-id",
        "app-1",
      );
    });

    it("Should call toast.success and navigate on chefs submission complete", () => {
      const service = buildService();
      mockUseQuery.mockReturnValue({ data: [service] });

      render(<typedRoute.options.component />);

      fireEvent.click(screen.getByRole("button", { name: "Submit Chefs" }));

      expect(mockToastSuccess).toHaveBeenCalledWith(
        `Your application for ${service.name} has been submitted successfully.`,
        expect.objectContaining({ description: expect.any(String) }),
      );
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/app/services/$serviceId",
        params: { serviceId: service.id },
      });
    });

    it("Should log error on chefs submission error without crashing", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const service = buildService();
      mockUseQuery.mockReturnValue({ data: [service] });

      render(<typedRoute.options.component />);

      fireEvent.click(screen.getByRole("button", { name: "Error Chefs" }));

      expect(consoleSpy).toHaveBeenCalledWith(
        "Submission error:",
        "chefs error",
      );
      consoleSpy.mockRestore();
    });

    it("Should fall back to loader service when useQuery returns empty", () => {
      mockUseQuery.mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);

      expect(
        screen.getByRole("heading", {
          name: "Income Support Application",
        }),
      ).toBeInTheDocument();
    });
  });
});
