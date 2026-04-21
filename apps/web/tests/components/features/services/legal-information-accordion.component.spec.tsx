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
  }: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
    <div>{children}</div>
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

import { LegalInformationAccordion } from "src/features/services/components/legal-information-accordion.component";

const service = {
  id: "svc-1",
  name: "Income Assistance",
  description: null,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  content: {
    resources: {
      legal: [
        { id: "l-1", label: "Employment and Assistance Act", url: "https://gov.bc.ca/ea-act" },
        { id: "l-2", label: "Persons with Disabilities Act", url: "https://gov.bc.ca/pwd-act" },
      ],
    },
  },
} as any;

describe("LegalInformationAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and policy trigger", () => {
    render(<LegalInformationAccordion service={service} />);

    expect(
      screen.getByRole("heading", { name: "Legal information" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Policy and legislation" }),
    ).toBeInTheDocument();
  });

  it("Should render both external links with correct text and href", () => {
    render(<LegalInformationAccordion service={service} />);

    const links = screen.getAllByTestId("external-link");
    expect(links).toHaveLength(2);

    expect(
      screen.getByText("Employment and Assistance Act"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Persons with Disabilities Act"),
    ).toBeInTheDocument();

    expect(links[0]).toHaveAttribute("href", "https://gov.bc.ca/ea-act");
    expect(links[1]).toHaveAttribute("href", "https://gov.bc.ca/pwd-act");
  });

  it("Should render links inside a list", () => {
    render(<LegalInformationAccordion service={service} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);

    listItems.forEach((item) => {
      expect(
        item.querySelector("[data-testid='external-link']"),
      ).not.toBeNull();
    });
  });
});
