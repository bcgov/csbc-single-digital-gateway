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

describe("LegalInformationAccordion Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the accordion heading and policy trigger", () => {
    render(<LegalInformationAccordion />);

    expect(
      screen.getByRole("heading", { name: "Legal information" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Policy and legislation" }),
    ).toBeInTheDocument();
  });

  it("Should render both external links with correct text and href", () => {
    render(<LegalInformationAccordion />);

    const links = screen.getAllByTestId("external-link");
    expect(links).toHaveLength(2);

    expect(
      screen.getByText(
        /BC Government Services Employment and Assistance Act and Regulations/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Employment and Assistance for Persons with Disabilities Act and Regulations/i,
      ),
    ).toBeInTheDocument();

    links.forEach((link) => {
      expect(link).toHaveAttribute("href", "https://gov.bc.ca");
    });
  });

  it("Should render links inside a list", () => {
    render(<LegalInformationAccordion />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);

    listItems.forEach((item) => {
      expect(
        item.querySelector("[data-testid='external-link']"),
      ).not.toBeNull();
    });
  });
});
