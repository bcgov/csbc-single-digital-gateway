import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "node:util";
import type { ComponentType } from "react";

Object.defineProperty(globalThis, "TextEncoder", {
  value: TextEncoder,
  writable: true,
});
Object.defineProperty(globalThis, "TextDecoder", {
  value: TextDecoder,
  writable: true,
});

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      path,
      options: config,
    });
  }),
}));

describe("AdminDashboard Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    jest.resetModules();
    jest.dontMock("src/features/auth/auth.context");
  });

  const loadAdminRoute = (user?: { name?: string; given_name?: string }) => {
    let adminRoute: {
      path: string;
      options: {
        component: ComponentType;
      };
    };

    jest.isolateModules(() => {
      jest.doMock("src/features/auth/auth.context", () => ({
        useIdirAuth: jest.fn(() => ({ user })),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      adminRoute = require("src/app/routes/admin/index").Route;
    });

    return adminRoute!;
  };

  it('Should create the admin route with path "/admin/"', () => {
    const adminRoute = loadAdminRoute({ name: "Admin User" });

    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/admin/");
    expect(adminRoute.path).toBe("/admin/");
    expect(typeof adminRoute.options.component).toBe("function");
  });

  it("Should render user.name when available", () => {
    const adminRoute = loadAdminRoute({
      name: "Lewis Chen",
      given_name: "Lewis",
    });
    const AdminComponent = adminRoute.options.component;

    const { getByRole } = render(<AdminComponent />);
    expect(
      getByRole("heading", { name: "Hello, Lewis Chen" }),
    ).toBeInTheDocument();
  });

  it("Should render user.given_name when name is missing", () => {
    const adminRoute = loadAdminRoute({ given_name: "Lewis" });
    const AdminComponent = adminRoute.options.component;

    const { getByRole } = render(<AdminComponent />);
    expect(getByRole("heading", { name: "Hello, Lewis" })).toBeInTheDocument();
  });

  it('Should render fallback "Admin" when user is missing', () => {
    const adminRoute = loadAdminRoute();
    const AdminComponent = adminRoute.options.component;

    const { getByRole } = render(<AdminComponent />);
    expect(getByRole("heading", { name: "Hello, Admin" })).toBeInTheDocument();
  });
});
