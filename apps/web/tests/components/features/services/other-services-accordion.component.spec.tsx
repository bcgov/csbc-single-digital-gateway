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

jest.mock("src/features/services/components/nav-link.component", () => ({
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

import { OtherServicesAccordion } from "src/features/services/components/other-services-accordion.component";

const service = {
  id: "svc-1",
  name: "Income Assistance",
  description: null,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  resources: {
    otherServices: {
      relatedServices: [{ id: "rs-1" }, { id: "rs-2" }],
      recommendedServices: [{ id: "rec-1" }, { id: "rec-2" }],
    },
  },
} as any;

describe("OtherServicesAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and both section triggers", () => {
    render(<OtherServicesAccordion service={service} />);

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
    render(<OtherServicesAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    const relatedLinks = navLinks.filter(
      (link) => link.getAttribute("aria-label") === "Related service",
    );
    expect(relatedLinks).toHaveLength(2);
  });

  it("Should render recommended service nav links with correct titles", () => {
    render(<OtherServicesAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    const recommendedLinks = navLinks.filter(
      (link) => link.getAttribute("aria-label") === "Recommended service",
    );
    expect(recommendedLinks).toHaveLength(2);
  });

  it("Should render all nav link items inside list items", () => {
    render(<OtherServicesAccordion service={service} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(4);

    listItems.forEach((item) => {
      expect(
        item.querySelector("[data-testid='nav-link-item']"),
      ).not.toBeNull();
    });
  });

  it("Should render all four icons with correct size and stroke props", () => {
    render(<OtherServicesAccordion service={service} />);

    const icons = screen.getAllByTestId("icon-cake");

    expect(icons).toHaveLength(4);

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("data-size", "20");
      expect(icon).toHaveAttribute("data-stroke", "1.5");
      expect(icon).toHaveClass("text-bcgov-blue");
    });
  });

  it("Should render a total of four nav link items across both accordion sections", () => {
    render(<OtherServicesAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    expect(navLinks).toHaveLength(4);
  });

  it("Should render nav links pointing to the placeholder href", () => {
    render(<OtherServicesAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");

    navLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "#");
    });
  });
});
