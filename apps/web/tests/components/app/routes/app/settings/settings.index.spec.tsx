import { createFileRoute } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  createFileRoute: jest.fn((path: string) => {
    return (config: { component: ComponentType }) => ({
      id: path,
      path,
      options: config,
    });
  }),
}));

jest.mock("@repo/ui", () => ({
  Card: ({
    children,
    className,
  }: {
    children?: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children?: ReactNode }) => (
    <p>{children}</p>
  ),
  CardHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: ReactNode }) => <h3>{children}</h3>,
  Separator: ({ className }: { className?: string }) => (
    <hr className={className} data-testid="separator" />
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconHistory: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="icon-history" />
  ),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/app/settings/index";

type MockedRoute = {
  path: string;
  options: {
    component: ComponentType;
  };
};

describe("SettingsPage Component Test", () => {
  const typedRoute = Route as unknown as MockedRoute;

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should create the route with path "/app/settings/"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/app/settings/");
    expect(typedRoute.path).toBe("/app/settings/");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render the settings page content", () => {
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage your account preferences and privacy settings."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Data & Privacy" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("separator")).toBeInTheDocument();
  });

  it("Should render the consent history card with link and icon", () => {
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    expect(
      screen.getByRole("heading", { name: "Consent History" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review your current and past consents for services."),
    ).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/app/settings/consent-history");
    expect(screen.getByTestId("icon-history")).toBeInTheDocument();
  });
});
