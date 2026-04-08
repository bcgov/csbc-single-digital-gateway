import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

jest.mock("@repo/ui", () => ({
  AccordionGroup: ({
    title,
    children,
  }: HTMLAttributes<HTMLDivElement> & {
    title?: string;
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

jest.mock("../nav-link.component", () => ({
  NavLinkItem: ({
    to,
    title,
    icon,
  }: {
    to: string;
    title: string;
    icon?: ReactNode;
  }) => (
    <a data-testid="nav-link-item" href={to} aria-label={title}>
      {icon}
      <span>{title}</span>
    </a>
  ),
}));

import { OtherServicesAccordion } from "../other-services-accordion.component";

describe("OtherServicesAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and both section triggers", () => {
    render(<OtherServicesAccordion />);

    expect(
      screen.getByRole("heading", { name: "Other services" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Related services" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Recommended services" }),
    ).toBeInTheDocument();
  });

  it("Should render related service nav links with correct titles", () => {
    render(<OtherServicesAccordion />);

    expect(screen.getByText("Disability Assistance")).toBeInTheDocument();
    expect(screen.getByText("Call us")).toBeInTheDocument();
  });

  it("Should render recommended service nav links with correct titles", () => {
    render(<OtherServicesAccordion />);

    expect(
      screen.getByText("Persons with Persistent Multiple Barriers"),
    ).toBeInTheDocument();

    expect(screen.getByText("Hardship Assistance")).toBeInTheDocument();
  });

  it("Should render all nav link items inside list items", () => {
    render(<OtherServicesAccordion />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(4);

    listItems.forEach((item) => {
      expect(
        item.querySelector("[data-testid='nav-link-item']"),
      ).not.toBeNull();
    });
  });

  it("Should render all four icons with correct size and stroke props", () => {
    render(<OtherServicesAccordion />);

    const icons = screen.getAllByTestId("icon-cake");

    expect(icons).toHaveLength(4);

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("data-size", "20");
      expect(icon).toHaveAttribute("data-stroke", "1.5");
      expect(icon).toHaveClass("text-bcgov-blue");
    });
  });

  it("Should render a total of four nav link items across both accordion sections", () => {
    render(<OtherServicesAccordion />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    expect(navLinks).toHaveLength(4);
  });

  it("Should render nav links pointing to the placeholder href", () => {
    render(<OtherServicesAccordion />);

    const navLinks = screen.getAllByTestId("nav-link-item");

    navLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "#");
    });
  });
});
