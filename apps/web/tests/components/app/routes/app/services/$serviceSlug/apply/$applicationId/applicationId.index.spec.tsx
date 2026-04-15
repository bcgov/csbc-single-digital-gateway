import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { mockConsentDocumentsQueryOptions } from "tests/utils/mocks/app/mock.consentDocumentsQueryOptions";
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

import { Route } from "src/app/routes/app/services/$serviceSlug/apply/$applicationId/index";

const { servicesQueryOptions: mockServicesQueryOptions } = jest.requireMock(
  "src/features/services/data/services.query",
) as { servicesQueryOptions: { queryKey: string[] } };

// ─── Types ───────────────────────────────────────────────────────────────────

const typedRoute = Route as unknown as RouteLike;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const params: Params = {
  serviceSlug: "income-assistance",
  applicationId: "app-1",
};

const buildApplication = (overrides?: Partial<Application>): Application => ({
  id: "app-1",
  label: "Income Support Application",
  formId: "form-123",
  apiKey: "key-abc",
  url: "https://chefs.example.com",
  blockType: "chefs",
  ...overrides,
});

const buildService = (overrides?: Partial<Service>): Service => ({
  slug: "income-assistance",
  name: "Income Assistance",
  settings: { consent: [] },
  applications: [buildApplication()],
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
        "/app/services/$serviceSlug/apply/$applicationId/",
      );
      expect(typedRoute.path).toBe(
        "/app/services/$serviceSlug/apply/$applicationId/",
      );
      expect(typeof typedRoute.options.component).toBe("function");
    });
  });

  // ─── beforeLoad ──────────────────────────────────────────────────────────

  describe("beforeLoad", () => {
    it("Should pass through when service has no consent documents", async () => {
      mockedEnsureQueryData.mockResolvedValueOnce([
        buildService({ settings: { consent: [] } }),
      ]);

      await expect(
        typedRoute.options.beforeLoad({ params }),
      ).resolves.toBeUndefined();

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockConsentDocumentsQueryOptions).not.toHaveBeenCalled();
    });

    it("Should pass through when all consent documents are already consented", async () => {
      mockedEnsureQueryData
        .mockResolvedValueOnce([
          buildService({
            settings: { consent: [{ documentId: "doc-1" }] },
          }),
        ])
        .mockResolvedValueOnce([]);

      await expect(
        typedRoute.options.beforeLoad({ params }),
      ).resolves.toBeUndefined();

      expect(mockConsentDocumentsQueryOptions).toHaveBeenCalledWith(["doc-1"]);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("Should redirect to data-and-privacy when unconsented documents exist", async () => {
      mockedEnsureQueryData
        .mockResolvedValueOnce([
          buildService({
            settings: { consent: [{ documentId: "doc-1" }] },
          }),
        ])
        .mockResolvedValueOnce([{ id: "doc-1" }]);

      await expect(typedRoute.options.beforeLoad({ params })).rejects.toEqual({
        type: "redirect",
        to: "/app/services/$serviceSlug/apply/$applicationId/data-and-privacy",
        params,
      });

      expect(mockRedirect).toHaveBeenCalledWith({
        to: "/app/services/$serviceSlug/apply/$applicationId/data-and-privacy",
        params,
      });
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
        buildService({ applications: [{ id: "other-app" }] }),
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
        service: { name: "Income Assistance", slug: "income-assistance" },
        application: { label: "Income Support Application" },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        {
          label: "Income Assistance",
          to: "/app/services/$serviceSlug",
          params: { serviceSlug: "income-assistance" },
        },
        { label: "Apply for Income Support Application" },
      ]);
    });

    it("Should build breadcrumbs with service only when application is missing", () => {
      const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
        service: { name: "Income Assistance", slug: "income-assistance" },
      });

      expect(breadcrumbs).toEqual([
        { label: "Services", to: "/app/services" },
        {
          label: "Income Assistance",
          to: "/app/services/$serviceSlug",
          params: { serviceSlug: "income-assistance" },
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

    it("Should render ChefsFormViewer when blockType is chefs", () => {
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
        "form-123",
      );
      expect(screen.queryByTestId("workflow-renderer")).not.toBeInTheDocument();
    });

    it("Should render WorkflowRenderer when blockType is workflow", () => {
      const service = buildService({
        applications: [buildApplication({ blockType: "workflow" })],
      });
      mockUseQuery.mockReturnValue({ data: [service] });
      mockRouteUseLoaderData.mockReturnValue({
        service,
        application: buildApplication({ blockType: "workflow" }),
      });

      render(<typedRoute.options.component />);

      expect(screen.getByTestId("workflow-renderer")).toBeInTheDocument();
      expect(screen.queryByTestId("chefs-form-viewer")).not.toBeInTheDocument();
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
        to: "/app/services/$serviceSlug",
        params: { serviceSlug: service.slug },
      });
    });

    it("Should call toast.success and navigate on workflow submission complete", () => {
      const service = buildService({
        applications: [buildApplication({ blockType: "workflow" })],
      });
      mockUseQuery.mockReturnValue({ data: [service] });
      mockRouteUseLoaderData.mockReturnValue({
        service,
        application: buildApplication({ blockType: "workflow" }),
      });

      render(<typedRoute.options.component />);

      fireEvent.click(screen.getByRole("button", { name: "Submit Workflow" }));

      expect(mockToastSuccess).toHaveBeenCalledWith(
        `Your application for ${service.name} has been submitted successfully.`,
        expect.objectContaining({ description: expect.any(String) }),
      );
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/app/services/$serviceSlug",
        params: { serviceSlug: service.slug },
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

    it("Should log error on workflow submission error without crashing", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const service = buildService({
        applications: [buildApplication({ blockType: "workflow" })],
      });
      mockUseQuery.mockReturnValue({ data: [service] });
      mockRouteUseLoaderData.mockReturnValue({
        service,
        application: buildApplication({ blockType: "workflow" }),
      });

      render(<typedRoute.options.component />);

      fireEvent.click(screen.getByRole("button", { name: "Error Workflow" }));

      expect(consoleSpy).toHaveBeenCalledWith(
        "Submission error:",
        "workflow error",
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
