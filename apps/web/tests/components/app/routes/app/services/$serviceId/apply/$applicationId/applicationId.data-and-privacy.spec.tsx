import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
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
  serviceQueryOptions: jest.fn((id: string) => ({
    queryKey: ["services", id],
  })),
}));

jest.mock("src/features/services/data/consent-document.query", () => ({
  consentDocumentsQueryOptions: jest.fn((ids: string[]) => ({
    queryKey: ["consent-documents", ids],
  })),
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

import { Route } from "src/app/routes/app/services/$serviceId/apply/$applicationId/data-and-privacy";

const typedRoute = Route as unknown as RouteLike;

const params: Params = {
  serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  applicationId: "app-1",
};

const buildService = (overrides?: Partial<Service>): Service => ({
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "Income Assistance",
  content: {
    applications: [{ id: "app-1" }],
    consents: [{ documentId: "doc-1" }, { documentId: "doc-2" }],
  },
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

  it('Should register the route with path "/app/services/$serviceId/apply/$applicationId/data-and-privacy"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith(
      "/app/services/$serviceId/apply/$applicationId/data-and-privacy",
    );
    expect(typedRoute.path).toBe(
      "/app/services/$serviceId/apply/$applicationId/data-and-privacy",
    );
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should redirect in beforeLoad when documentIds is empty", async () => {
    await expect(typedRoute.options.beforeLoad({ params })).rejects.toEqual({
      type: "redirect",
      to: "/app/services/$serviceId/apply/$applicationId",
      params,
    });

    expect(mockRedirect).toHaveBeenCalledWith({
      to: "/app/services/$serviceId/apply/$applicationId",
      params,
    });
  });

  it("Should load service, application, and documentIds", async () => {
    const service = buildService();
    mockEnsureQueryData
      .mockResolvedValueOnce(service)
      .mockResolvedValueOnce([{ id: "doc-1" }]);

    const result = await typedRoute.options.loader({ params });

    expect(result).toEqual({
      service,
      application: { id: "app-1" },
      documentIds: ["doc-1", "doc-2"],
    });
    expect(mockEnsureQueryData).toHaveBeenNthCalledWith(1, {
      queryKey: ["services", params.serviceId],
    });
  });

  it("Should throw notFound when the service request returns 404", async () => {
    mockEnsureQueryData.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404 },
    });

    await expect(typedRoute.options.loader({ params })).rejects.toEqual({
      type: "not-found",
    });

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("Should throw notFound when the application does not exist", async () => {
    mockEnsureQueryData.mockResolvedValueOnce(
      buildService({
        content: { applications: [{ id: "other-app" }], consents: [] },
      }),
    );

    await expect(typedRoute.options.loader({ params })).rejects.toEqual({
      type: "not-found",
    });

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("Should build breadcrumbs with the service breadcrumb when loader data contains a service", () => {
    const breadcrumbs = typedRoute.options.staticData.breadcrumbs({
      service: {
        name: "Income Assistance",
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      },
    });

    expect(breadcrumbs).toEqual([
      { label: "Services", to: "/app/services" },
      {
        label: "Income Assistance",
        to: "/app/services/$serviceId",
        params: { serviceId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
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
      to: "/app/services/$serviceId/apply/$applicationId",
      params,
    });
  });
});
