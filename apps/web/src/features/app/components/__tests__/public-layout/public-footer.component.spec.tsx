import { cleanup, render, screen } from "@testing-library/react";
import { PublicFooter } from "../../public-layout/public-footer.component";

jest.mock("../../container.component", () => ({
  Container: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

jest.mock("@repo/ui", () => ({
  Button: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <div data-testid="button" data-variant={variant}>
      {children}
    </div>
  ),
}));

describe("PublicFooter Component Test", () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      name: "Accessibility",
      href: "https://www2.gov.bc.ca/gov/content/home/accessible-government",
    },
    {
      name: "Privacy",
      href: "https://www2.gov.bc.ca/gov/content/home/privacy",
    },
    {
      name: "Copyright",
      href: "https://www2.gov.bc.ca/gov/content/home/copyright",
    },
    {
      name: "Disclaimer",
      href: "https://www2.gov.bc.ca/gov/content/home/disclaimer",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render the footer content and current year", () => {
    render(<PublicFooter />);

    expect(screen.getByTestId("container")).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`${currentYear} Government of British Columbia`, "i"),
      ),
    ).toBeInTheDocument();
  });

  it("Should render all public footer links with the correct external targets", () => {
    render(<PublicFooter />);

    footerLinks.forEach(({ name, href }) => {
      const link = screen.getByRole("link", { name });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("Should wrap each footer link in a link variant button", () => {
    render(<PublicFooter />);

    const buttons = screen.getAllByTestId("button");

    expect(buttons).toHaveLength(4);

    buttons.forEach((button) => {
      expect(button).toHaveAttribute("data-variant", "link");
    });
  });
});
