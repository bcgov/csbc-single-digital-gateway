import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

jest.mock("@repo/ui", () => ({
  AccordionGroup: ({
    title,
    children,
  }: HTMLAttributes<HTMLDivElement> & {
    title?: string;
    values?: string[];
    children?: ReactNode;
  }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
  AccordionItem: ({
    children,
  }: HTMLAttributes<HTMLElement> & {
    value?: string;
    children?: ReactNode;
  }) => <section>{children}</section>,
  AccordionTrigger: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AccordionContent: ({
    children,
  }: HTMLAttributes<HTMLDivElement> & {
    className?: string;
    children?: ReactNode;
  }) => <div>{children}</div>,
}));

jest.mock("@tabler/icons-react", () => ({
  IconCake: ({
    size,
    stroke,
    className,
  }: {
    size?: number;
    stroke?: number;
    className?: string;
  }) => (
    <svg
      data-testid="icon-cake"
      data-size={size}
      data-stroke={stroke}
      className={className}
    />
  ),
}));

jest.mock("../external-link.component", () => ({
  ExternalLink: ({
    href,
    children,
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
  }) => (
    <a data-testid="external-link" href={href}>
      {children}
    </a>
  ),
}));

jest.mock("../nav-link.component", () => ({
  NavLinkItem: ({
    to,
    title,
    description,
    icon,
  }: {
    to: string;
    title: string;
    description?: string;
    icon?: ReactNode;
  }) => (
    <a data-testid="nav-link-item" href={to} aria-label={title}>
      {icon}
      <span data-testid="nav-link-title">{title}</span>
      {description && (
        <span data-testid="nav-link-description">{description}</span>
      )}
    </a>
  ),
}));

import { ResourcesSupportAccordion } from "../resources-support-accordion.component";

describe("ResourcesSupportAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and all three section triggers", () => {
    render(<ResourcesSupportAccordion />);

    expect(
      screen.getByRole("heading", { name: "Resources & Support" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Recommended reading" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Get help" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Application support" }),
    ).toBeInTheDocument();
  });

  it("Should render all four recommended reading external links with correct text and href", () => {
    render(<ResourcesSupportAccordion />);

    expect(screen.getByText("Apply for assistance")).toBeInTheDocument();
    expect(screen.getByText("On assistance")).toBeInTheDocument();
    expect(screen.getByText("Payment dates")).toBeInTheDocument();
    expect(screen.getByText("Access services")).toBeInTheDocument();

    const externalLinks = screen.getAllByTestId("external-link");
    expect(externalLinks).toHaveLength(4);

    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "https://gov.bc.ca");
    });
  });

  it("Should render recommended reading links inside list items", () => {
    render(<ResourcesSupportAccordion />);

    const listItems = screen.getAllByRole("listitem");
    const externalLinks = screen.getAllByTestId("external-link");

    const externalListItems = listItems.filter((item) =>
      item.querySelector("[data-testid='external-link']"),
    );

    expect(externalListItems).toHaveLength(externalLinks.length);
  });

  it("Should render get help nav links with correct titles and descriptions", () => {
    render(<ResourcesSupportAccordion />);

    expect(screen.getByText("Help center")).toBeInTheDocument();
    expect(screen.getByText("Help and support resources.")).toBeInTheDocument();

    expect(screen.getByText("Income Assistance Office")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run by the Ministry of Social Development and Poverty Reduction",
      ),
    ).toBeInTheDocument();

    expect(screen.getByText("Report fraud")).toBeInTheDocument();
    expect(screen.getByText("reportfraud@gov.bc.ca")).toBeInTheDocument();
  });

  it("Should render application support nav links with correct titles and descriptions", () => {
    render(<ResourcesSupportAccordion />);

    expect(screen.getByText("Call us")).toBeInTheDocument();
    expect(screen.getByText("Toll Free: 1-866-866-08666")).toBeInTheDocument();

    expect(screen.getByText("Service B.C.")).toBeInTheDocument();
    expect(
      screen.getByText("Run by the Ministry of Citizens' Services"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Public Guardian and Trustee of BC"),
    ).toBeInTheDocument();
  });

  it("Should render all six nav link items inside list items", () => {
    render(<ResourcesSupportAccordion />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    expect(navLinks).toHaveLength(6);

    const listItems = screen.getAllByRole("listitem");
    const navListItems = listItems.filter((item) =>
      item.querySelector("[data-testid='nav-link-item']"),
    );

    expect(navListItems).toHaveLength(6);
  });

  it("Should render all six icons with correct size, stroke, and class", () => {
    render(<ResourcesSupportAccordion />);

    const icons = screen.getAllByTestId("icon-cake");
    expect(icons).toHaveLength(6);

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("data-size", "20");
      expect(icon).toHaveAttribute("data-stroke", "1.5");
      expect(icon).toHaveClass("text-bcgov-blue");
    });
  });

  it("Should render a total of four external links and six nav link items", () => {
    render(<ResourcesSupportAccordion />);

    expect(screen.getAllByTestId("external-link")).toHaveLength(4);
    expect(screen.getAllByTestId("nav-link-item")).toHaveLength(6);
  });

  it("Should render all nav link items pointing to the placeholder href", () => {
    render(<ResourcesSupportAccordion />);

    screen.getAllByTestId("nav-link-item").forEach((link) => {
      expect(link).toHaveAttribute("href", "#");
    });
  });
});
