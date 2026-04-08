import { createFileRoute } from "@tanstack/react-router";
import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children?: ReactNode }) => (
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
  AccordionGroup: ({
    title,
    children,
  }: {
    title: string;
    children?: ReactNode;
  }) => (
    <section>
      <h5>{title}</h5>
      {children}
    </section>
  ),
  AccordionItem: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  AccordionTrigger: ({ children }: { children?: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AccordionContent: ({
    className,
    children,
  }: {
    className?: string;
    children?: ReactNode;
  }) => <div className={className}>{children}</div>,
  buttonVariants: jest.fn(
    ({ variant, size }: { variant?: string; size?: string }) =>
      `btn-${variant ?? "default"}-${size ?? "default"}`,
  ),
}));

jest.mock("@tabler/icons-react", () => {
  const MockIcon = ({ className }: { className?: string }) => (
    <svg data-testid="mock-icon" className={className} />
  );

  return {
    IconArrowRight: MockIcon,
    IconExternalLink: MockIcon,
    IconPlayerPlay: MockIcon,
    IconPlus: MockIcon,
    IconCake: MockIcon,
  };
});

jest.mock("src/features/services/components/external-link.component", () => ({
  ExternalLink: ({
    href,
    children,
  }: {
    href: string;
    children?: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("src/features/services/components/nav-link.component", () => ({
  NavLinkItem: ({
    to,
    icon,
    title,
    description,
  }: {
    to: string;
    icon?: ReactNode;
    title: string;
    description?: string;
  }) => (
    <a href={to}>
      {icon}
      <span>{title}</span>
      {description ? <span>{description}</span> : null}
    </a>
  ),
}));

// ─── Route import (after mocks) ───────────────────────────────────────────────

import { Route } from "src/app/routes/dev/index";

type MockedRoute = {
  path: string;
  options: {
    component: ComponentType;
  };
};

describe("Dev Route Component Test", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('Should create the route with path "/dev/"', () => {
    const mockedCreateFileRoute = createFileRoute as unknown as jest.Mock;
    const typedRoute = Route as unknown as MockedRoute;

    expect(mockedCreateFileRoute).toHaveBeenCalledTimes(1);
    expect(mockedCreateFileRoute).toHaveBeenCalledWith("/dev/");
    expect(typedRoute.path).toBe("/dev/");
    expect(typeof typedRoute.options.component).toBe("function");
  });

  it("Should render key content sections", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    expect(
      screen.getByRole("heading", { name: "Tailwind Helper Class Reference" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Color palette" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Components: Buttons & links" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Components: Accordion & Accordion Group",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Resources & Support")).toBeInTheDocument();
  });

  it("Should render expected internal and external links", () => {
    const typedRoute = Route as unknown as MockedRoute;
    const RouteComponent = typedRoute.options.component;

    render(<RouteComponent />);

    expect(
      screen.getByRole("link", { name: /internal button/i }),
    ).toHaveAttribute("href", "/app/services");

    expect(
      screen.getByRole("link", { name: /external button/i }),
    ).toHaveAttribute("href", "https://www2.gov.bc.ca");

    expect(
      screen.getByRole("link", { name: /apply for assistance/i }),
    ).toHaveAttribute("href", "https://gov.bc.ca");
  });
});
