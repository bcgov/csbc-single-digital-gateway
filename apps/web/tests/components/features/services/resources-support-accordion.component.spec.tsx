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

jest.mock("src/features/services/components/external-link.component", () => ({
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

jest.mock("src/features/services/components/nav-link.component", () => ({
  NavLinkItem: ({
    to,
    title,
    description,
    meta,
    icon,
  }: {
    to?: string;
    title: string;
    description?: string;
    meta?: string;
    icon?: ReactNode;
  }) => (
    <a data-testid="nav-link-item" href={to ?? "#"} aria-label={title}>
      {icon}
      <span data-testid="nav-link-title">{title}</span>
      {description && (
        <span data-testid="nav-link-description">{description}</span>
      )}
      {meta && <span data-testid="nav-link-meta">{meta}</span>}
    </a>
  ),
}));

import { ResourcesSupportAccordion } from "src/features/services/components/resources-support-accordion.component";

const service = {
  id: "svc-1",
  name: "Income Assistance",
  description: null,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  content: {
    contactMethods: [
      { id: "cm-w1", type: "link", label: "Help center", description: "Help and support resources.", url: "https://gov.bc.ca/help" },
      { id: "cm-e1", type: "value", label: "Report fraud", description: "reportfraud@gov.bc.ca", value: "reportfraud@gov.bc.ca" },
      { id: "cm-p1", type: "phone", label: "Income Assistance Office", description: "Run by the Ministry of Social Development and Poverty Reduction", value: "1-800-000-0000" },
    ],
  },
} as any;

describe("ResourcesSupportAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and contact methods trigger", () => {
    render(<ResourcesSupportAccordion service={service} />);

    expect(
      screen.getByRole("heading", { name: "Resources & Support" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Get help" }),
    ).toBeInTheDocument();
  });

  it("Should render get help nav links with correct titles and descriptions", () => {
    render(<ResourcesSupportAccordion service={service} />);

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

  it("Should render all three nav link items inside list items", () => {
    render(<ResourcesSupportAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    expect(navLinks).toHaveLength(3);

    const listItems = screen.getAllByRole("listitem");
    const navListItems = listItems.filter((item) =>
      item.querySelector("[data-testid='nav-link-item']"),
    );

    expect(navListItems).toHaveLength(3);
  });

  it("Should render all three icons with correct size, stroke, and class", () => {
    render(<ResourcesSupportAccordion service={service} />);

    const icons = screen.getAllByTestId("icon-cake");
    expect(icons).toHaveLength(3);

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("data-size", "20");
      expect(icon).toHaveAttribute("data-stroke", "1.5");
      expect(icon).toHaveClass("text-bcgov-blue");
    });
  });

  it("Should render nav link hrefs computed from contact method types", () => {
    render(<ResourcesSupportAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    expect(navLinks).toHaveLength(3);
    const hrefs = navLinks.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("https://gov.bc.ca/help");
    expect(hrefs).toContain("mailto:reportfraud@gov.bc.ca");
    expect(hrefs).toContain("tel:1-800-000-0000");
  });

  it("Should return null when there are no contact methods", () => {
    const emptyService = { ...service, content: { contactMethods: [] } } as any;
    const { container } = render(<ResourcesSupportAccordion service={emptyService} />);
    expect(container.innerHTML).toBe("");
  });
});
