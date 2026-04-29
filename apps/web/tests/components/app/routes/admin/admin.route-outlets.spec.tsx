import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

jest.mock("@tanstack/react-router", () => ({
  createFileRoute: jest.fn((path: string) => {
    return (config: Record<string, unknown>) => ({
      path,
      options: config,
    });
  }),
  Outlet: () => <div data-testid="outlet" />,
}));

describe("Admin Route Outlets", () => {
  afterEach(cleanup);

  const outletRoutes = [
    { path: "/admin/services", module: "src/app/routes/admin/services/route" },
    { path: "/admin/consent", module: "src/app/routes/admin/consent/route" },
    { path: "/admin/consent/documents", module: "src/app/routes/admin/consent/documents/route" },
    { path: "/admin/settings/consent", module: "src/app/routes/admin/settings/consent/route" },
    { path: "/admin/settings/services", module: "src/app/routes/admin/settings/services/route" },
    { path: "/admin/settings/org-units", module: "src/app/routes/admin/settings/org-units/route" },
    { path: "/admin/settings/consent/document-types", module: "src/app/routes/admin/settings/consent/document-types/route" },
    { path: "/admin/settings/services/service-types", module: "src/app/routes/admin/settings/services/service-types/route" },
  ];

  for (const { path, module: modulePath } of outletRoutes) {
    it(`Should register ${path} and render Outlet`, () => {
      jest.isolateModules(() => {
        const mod = require(modulePath) as { Route: { path: string; options: { component: ComponentType } } };
        expect(mod.Route.path).toBe(path);
        const Component = mod.Route.options.component;
        if (Component) {
          const { unmount } = render(<Component />);
          expect(screen.getByTestId("outlet")).toBeInTheDocument();
          unmount();
        }
      });
    });
  }
});
