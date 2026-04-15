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
  resources: {
    recommendedReading: [
      { id: "rr-1", label: "Apply for assistance", url: "https://gov.bc.ca/apply" },
      { id: "rr-2", label: "On assistance", url: "https://gov.bc.ca/on" },
      { id: "rr-3", label: "Payment dates", url: "https://gov.bc.ca/pay" },
      { id: "rr-4", label: "Access services", url: "https://gov.bc.ca/access" },
    ],
    contactMethods: {
      web: [
        { id: "cm-w1", label: "Help center", description: "Help and support resources.", value: "https://gov.bc.ca/help" },
      ],
      email: [
        { id: "cm-e1", label: "Report fraud", description: "reportfraud@gov.bc.ca", value: "reportfraud@gov.bc.ca" },
      ],
      phone: [
        { id: "cm-p1", label: "Income Assistance Office", description: "Run by the Ministry of Social Development and Poverty Reduction", value: "1-800-000-0000" },
      ],
    },
    applicationSupport: [
      { id: "as-1", label: "Call us", description: "Toll Free: 1-866-866-08666", value: "tel:1-866-866-08666" },
      { id: "as-2", label: "Service B.C.", description: "Run by the Ministry of Citizens' Services", value: "https://servicebc.gov.bc.ca" },
      { id: "as-3", label: "Public Guardian and Trustee of BC", description: undefined, value: "https://trustee.bc.ca" },
    ],
  },
} as any;

describe("ResourcesSupportAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and all three section triggers", () => {
    render(<ResourcesSupportAccordion service={service} />);

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
    render(<ResourcesSupportAccordion service={service} />);

    expect(screen.getByText("Apply for assistance")).toBeInTheDocument();
    expect(screen.getByText("On assistance")).toBeInTheDocument();
    expect(screen.getByText("Payment dates")).toBeInTheDocument();
    expect(screen.getByText("Access services")).toBeInTheDocument();

    const externalLinks = screen.getAllByTestId("external-link");
    expect(externalLinks).toHaveLength(4);

    expect(externalLinks[0]).toHaveAttribute("href", "https://gov.bc.ca/apply");
    expect(externalLinks[1]).toHaveAttribute("href", "https://gov.bc.ca/on");
    expect(externalLinks[2]).toHaveAttribute("href", "https://gov.bc.ca/pay");
    expect(externalLinks[3]).toHaveAttribute("href", "https://gov.bc.ca/access");
  });

  it("Should render recommended reading links inside list items", () => {
    render(<ResourcesSupportAccordion service={service} />);

    const listItems = screen.getAllByRole("listitem");
    const externalLinks = screen.getAllByTestId("external-link");

    const externalListItems = listItems.filter((item) =>
      item.querySelector("[data-testid='external-link']"),
    );

    expect(externalListItems).toHaveLength(externalLinks.length);
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

  it("Should render application support nav links with correct titles and descriptions", () => {
    render(<ResourcesSupportAccordion service={service} />);

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
    render(<ResourcesSupportAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    expect(navLinks).toHaveLength(6);

    const listItems = screen.getAllByRole("listitem");
    const navListItems = listItems.filter((item) =>
      item.querySelector("[data-testid='nav-link-item']"),
    );

    expect(navListItems).toHaveLength(6);
  });

  it("Should render all six icons with correct size, stroke, and class", () => {
    render(<ResourcesSupportAccordion service={service} />);

    const icons = screen.getAllByTestId("icon-cake");
    expect(icons).toHaveLength(6);

    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("data-size", "20");
      expect(icon).toHaveAttribute("data-stroke", "1.5");
      expect(icon).toHaveClass("text-bcgov-blue");
    });
  });

  it("Should render a total of four external links and six nav link items", () => {
    render(<ResourcesSupportAccordion service={service} />);

    expect(screen.getAllByTestId("external-link")).toHaveLength(4);
    expect(screen.getAllByTestId("nav-link-item")).toHaveLength(6);
  });

  it("Should render nav link hrefs computed from values", () => {
    render(<ResourcesSupportAccordion service={service} />);

    const navLinks = screen.getAllByTestId("nav-link-item");
    // Contact methods: web uses value directly, email gets mailto:, phone gets tel:
    // Application support: uses value directly
    const hrefs = navLinks.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("https://gov.bc.ca/help");
    expect(hrefs).toContain("mailto:reportfraud@gov.bc.ca");
    expect(hrefs).toContain("tel:1-800-000-0000");
  });
});
