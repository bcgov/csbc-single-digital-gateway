import { createFileRoute } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      path,
      options: config,
    });
  }),
  Outlet: () => <div data-testid="outlet" />,
}));

describe("Admin Param-Based Route Outlets", () => {
  const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("/admin/services/$serviceId route", () => {
    it("Should register at /admin/services/$serviceId", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        require("src/app/routes/admin/services/$serviceId/route");
        expect(mockedCreateFileRoute).toHaveBeenCalledWith("/admin/services/$serviceId");
      });
    });

    it("Should render Outlet as its component", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        const mod = require("src/app/routes/admin/services/$serviceId/route");
        const RouteConfig = mod.Route as unknown as {
          options: { component: ComponentType };
        };
        render(<RouteConfig.options.component />);
        expect(screen.getByTestId("outlet")).toBeInTheDocument();
      });
    });
  });

  describe("/admin/consent/documents/$docId route", () => {
    it("Should register at /admin/consent/documents/$docId", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        require("src/app/routes/admin/consent/documents/$docId/route");
        expect(mockedCreateFileRoute).toHaveBeenCalledWith(
          "/admin/consent/documents/$docId",
        );
      });
    });

    it("Should render Outlet as its component", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        const mod = require("src/app/routes/admin/consent/documents/$docId/route");
        const RouteConfig = mod.Route as unknown as {
          options: { component: ComponentType };
        };
        render(<RouteConfig.options.component />);
        expect(screen.getByTestId("outlet")).toBeInTheDocument();
      });
    });
  });

  describe("/admin/settings/services/service-types/$typeId route", () => {
    it("Should register at /admin/settings/services/service-types/$typeId", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        require(
          "src/app/routes/admin/settings/services/service-types/$typeId/route",
        );
        expect(mockedCreateFileRoute).toHaveBeenCalledWith(
          "/admin/settings/services/service-types/$typeId",
        );
      });
    });

    it("Should render Outlet as its component", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        const mod = require(
          "src/app/routes/admin/settings/services/service-types/$typeId/route",
        );
        const RouteConfig = mod.Route as unknown as {
          options: { component: ComponentType };
        };
        render(<RouteConfig.options.component />);
        expect(screen.getByTestId("outlet")).toBeInTheDocument();
      });
    });
  });

  describe("/admin/settings/consent/document-types/$typeId route", () => {
    it("Should register at /admin/settings/consent/document-types/$typeId", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        require(
          "src/app/routes/admin/settings/consent/document-types/$typeId/route",
        );
        expect(mockedCreateFileRoute).toHaveBeenCalledWith(
          "/admin/settings/consent/document-types/$typeId",
        );
      });
    });

    it("Should render Outlet as its component", () => {
      jest.isolateModules(() => {
        mockedCreateFileRoute.mockClear();
        const mod = require(
          "src/app/routes/admin/settings/consent/document-types/$typeId/route",
        );
        const RouteConfig = mod.Route as unknown as {
          options: { component: ComponentType };
        };
        render(<RouteConfig.options.component />);
        expect(screen.getByTestId("outlet")).toBeInTheDocument();
      });
    });
  });
});
