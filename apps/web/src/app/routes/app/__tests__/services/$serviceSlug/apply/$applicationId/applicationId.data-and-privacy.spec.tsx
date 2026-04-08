import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { mockConsentDocumentsQueryOptions } from "tests/utils/mocks/app/routes/mock.consentDocumentsQueryOptions";
import type {
  Params,
  RouteLike,
  Service,
} from "tests/utils/types/app/routes/routes.type";

const mockNavigate = jest.fn();
const mockUseNavigate = jest.fn(() => mockNavigate);
const mockRouteUseLoaderData = jest.fn();
const mockRouteUseParams = jest.fn();
const mockRedirect = jest.fn((value: unknown) => ({
  type: "redirect",
  ...(value as object),
}));
const mockNotFound = jest.fn(() => ({ type: "not-found" }));
const mockEnsureQueryData = jest.fn();
const mockInvalidateQueries = jest.fn();

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

jest.mock("src/features/services/components/consent-gate.component", () => ({
  ConsentGate: ({
    documentIds,
    onAgree,
  }: {
    documentIds: string[];
    onAgree: () => void;
  }) => (
    <div data-testid="consent-gate">
      <div data-testid="document-ids">{documentIds.join(",")}</div>
      <button type="button" onClick={onAgree}>
        Agree
      </button>
    </div>
  ),
}));

jest.mock("src/features/services/data/services.query", () => ({
  servicesQueryOptions: { queryKey: ["services"] },
}));

jest.mock("src/lib/react-query.client", () => ({
  queryClient: {
    ensureQueryData: (...args: unknown[]) =>
      mockEnsureQueryData(...(args as [unknown])),
    invalidateQueries: (...args: unknown[]) =>
      mockInvalidateQueries(...(args as [unknown])),
  },
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/services/$serviceSlug/apply/$applicationId/data-and-privacy";

const { servicesQueryOptions: mockServicesQueryOptions } = jest.requireMock(
  "src/features/services/data/services.query",
) as { servicesQueryOptions: { queryKey: string[] } };

const typedRoute = Route as unknown as RouteLike;

const params: Params = {
  serviceSlug: "income-assistance",
  applicationId: "app-1",
};

const buildService = (overrides?: Partial<Service>): Service => ({
  slug: "income-assistance",
  name: "Income Assistance",
  settings: {
    consent: [{ documentId: "doc-1" }, { documentId: "doc-2" }],
  },
  applications: [{ id: "app-1" }],
  ...overrides,
});

describe("DataAndPrivacy Route Test", () => {
  beforeEach(() => {
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockRouteUseLoaderData.mockReturnValue({ documentIds: [] });
    mockRouteUseParams.mockReturnValue(params);

    typedRoute.useLoaderData = mockRouteUseLoaderData;
    typedRoute.useParams = mockRouteUseParams;
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should register the route with path "/app/services/$serviceSlug/apply/$applicationId/data-and-privacy"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith(
      "/app/services/$serviceSlug/apply/$applicationId/data-and-privacy",
    );
    expect(typedRoute.path).toBe(
      "/app/services/$serviceSlug/apply/$applicationId/data-and-privacy",
    );
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should redirect in beforeLoad when the service has no consent documents", async () => {
    mockEnsureQueryData.mockResolvedValueOnce([
      buildService({ settings: { consent: [] } }),
    ]);

    await expect(typedRoute.options.beforeLoad({ params })).rejects.toEqual({
      type: "redirect",
      to: "/app/services/$serviceSlug/apply/$applicationId",
      params,
    });

    expect(mockEnsureQueryData).toHaveBeenCalledWith(mockServicesQueryOptions);
    expect(mockRedirect).toHaveBeenCalledWith({
      to: "/app/services/$serviceSlug/apply/$applicationId",
      params,
    });
    expect(mockConsentDocumentsQueryOptions).not.toHaveBeenCalled();
  });

  it("Should redirect in beforeLoad when all consent documents are already consented", async () => {
    mockEnsureQueryData
      .mockResolvedValueOnce([buildService()])
      .mockResolvedValueOnce([]);

    await expect(typedRoute.options.beforeLoad({ params })).rejects.toEqual({
      type: "redirect",
      to: "/app/services/$serviceSlug/apply/$applicationId",
      params,
    });

    expect(mockConsentDocumentsQueryOptions).toHaveBeenCalledWith([
      "doc-1",
      "doc-2",
    ]);
    expect(mockRedirect).toHaveBeenCalledWith({
      to: "/app/services/$serviceSlug/apply/$applicationId",
      params,
    });
  });

  it("Should allow beforeLoad to resolve when unconsented documents exist", async () => {
    mockEnsureQueryData
      .mockResolvedValueOnce([buildService()])
      .mockResolvedValueOnce([{ id: "doc-1" }]);

    await expect(
      typedRoute.options.beforeLoad({ params }),
    ).resolves.toBeUndefined();

    expect(mockConsentDocumentsQueryOptions).toHaveBeenCalledWith([
      "doc-1",
      "doc-2",
    ]);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("Should load service, application, and documentIds", async () => {
    const service = buildService();
    mockEnsureQueryData
      .mockResolvedValueOnce([service])
      .mockResolvedValueOnce([{ id: "doc-1" }]);

    const result = await typedRoute.options.loader({ params });

    expect(result).toEqual({
      service,
      application: { id: "app-1" },
      documentIds: ["doc-1", "doc-2"],
    });
    expect(mockEnsureQueryData).toHaveBeenNthCalledWith(
      1,
      mockServicesQueryOptions,
    );
    expect(mockConsentDocumentsQueryOptions).toHaveBeenCalledWith([
      "doc-1",
      "doc-2",
    ]);
  });

  it("Should throw notFound when the service does not exist", async () => {
    mockEnsureQueryData.mockResolvedValueOnce([]);

    await expect(typedRoute.options.loader({ params })).rejects.toEqual({
      type: "not-found",
    });

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("Should throw notFound when the application does not exist", async () => {
    mockEnsureQueryData.mockResolvedValueOnce([
      buildService({ applications: [{ id: "other-app" }] }),
    ]);

    await expect(typedRoute.options.loader({ params })).rejects.toEqual({
      type: "not-found",
    });

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("Should build breadcrumbs with the service breadcrumb when loader data contains a service", () => {
    const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
      service: {
        name: "Income Assistance",
        slug: "income-assistance",
      },
    });

    expect(breadcrumbs).toEqual([
      { label: "Services", to: "/app/services" },
      {
        label: "Income Assistance",
        to: "/app/services/$serviceSlug",
        params: { serviceSlug: "income-assistance" },
      },
      { label: "Data & privacy" },
    ]);
  });

  it("Should build breadcrumbs without a service breadcrumb when loader data is missing", () => {
    const breadcrumbs = typedRoute.options.staticData.breadcrumbs(undefined);

    expect(breadcrumbs).toEqual([
      { label: "Services", to: "/app/services" },
      { label: "Data & privacy" },
    ]);
  });

  it("Should render ConsentGate and navigate after agreement", () => {
    mockRouteUseLoaderData.mockReturnValue({ documentIds: ["doc-1", "doc-2"] });
    mockRouteUseParams.mockReturnValue(params);

    const Component = typedRoute.options.component;
    render(<Component />);

    expect(screen.getByTestId("consent-gate")).toBeInTheDocument();
    expect(screen.getByTestId("document-ids")).toHaveTextContent("doc-1,doc-2");

    fireEvent.click(screen.getByRole("button", { name: "Agree" }));

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["consent-documents"],
    });
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/app/services/$serviceSlug/apply/$applicationId",
      params,
    });
  });
});
