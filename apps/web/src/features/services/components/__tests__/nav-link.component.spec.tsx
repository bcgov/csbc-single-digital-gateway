import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children?: ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("@tabler/icons-react", () => ({
  IconChevronRight: ({
    className,
    size,
    stroke,
  }: {
    className?: string;
    size?: number;
    stroke?: number;
  }) => (
    <svg
      data-testid="icon-chevron-right"
      data-size={size}
      data-stroke={stroke}
      className={className}
    />
  ),
}));

import { NavLinkItem } from "../nav-link.component";

describe("NavLinkItem Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the link with correct href and layout classes", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="icon-home" />}
        title="Dashboard"
        to="/app/dashboard"
      />,
    );

    const link = screen.getByRole("link");

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/app/dashboard");
    expect(link).toHaveClass(
      "flex",
      "items-center",
      "gap-4",
      "px-4",
      "py-3",
      "hover:bg-accent",
      "transition-colors",
      "no-underline",
    );
  });

  it("Should render the title text", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="icon-home" />}
        title="My Services"
        to="/app/services"
      />,
    );

    const title = screen.getByText("My Services");

    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("SPAN");
    expect(title).toHaveClass("text-sm", "font-semibold", "truncate");
  });

  it("Should not render description when the prop is omitted", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="icon-home" />}
        title="Applications"
        to="/app/applications"
      />,
    );

    expect(screen.queryByText(/muted-foreground/)).not.toBeInTheDocument();

    const spans = screen.getAllByText(/.+/);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toHaveTextContent("Applications");
  });

  it("Should render description with muted-foreground class when provided", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="icon-home" />}
        title="Settings"
        description="Manage your account settings"
        to="/app/settings"
      />,
    );

    const description = screen.getByText("Manage your account settings");

    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe("SPAN");
    expect(description).toHaveClass(
      "text-sm",
      "text-muted-foreground",
      "truncate",
    );
  });

  it("Should render the icon inside the icon wrapper with correct classes", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="nav-custom-icon" />}
        title="Profile"
        to="/app/profile"
      />,
    );

    const icon = screen.getByTestId("nav-custom-icon");
    expect(icon).toBeInTheDocument();

    const wrapper = icon.parentElement;
    expect(wrapper).toHaveClass(
      "shrink-0",
      "flex",
      "items-center",
      "justify-center",
      "w-10",
      "h-10",
      "bg-blue-10",
    );
  });

  it("Should render the chevron icon with correct props", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="icon-home" />}
        title="Notifications"
        to="/app/notifications"
      />,
    );

    const chevron = screen.getByTestId("icon-chevron-right");

    expect(chevron).toBeInTheDocument();
    expect(chevron).toHaveClass("shrink-0", "text-muted-foreground");
    expect(chevron).toHaveAttribute("data-size", "20");
    expect(chevron).toHaveAttribute("data-stroke", "1.5");
  });

  it("Should render both title and description when all props are provided", () => {
    render(
      <NavLinkItem
        icon={<svg data-testid="icon-doc" />}
        title="Documents"
        description="View your submitted documents"
        to="/app/documents"
      />,
    );

    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(
      screen.getByText("View your submitted documents"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("icon-doc")).toBeInTheDocument();
    expect(screen.getByTestId("icon-chevron-right")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app/documents");
  });
});
