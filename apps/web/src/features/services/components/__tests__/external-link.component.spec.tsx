import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

jest.mock("../../../../../../../packages/ui/src/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | null | false>) =>
    classes.filter(Boolean).join(" "),
}));

jest.mock("@tabler/icons-react", () => ({
  IconExternalLink: ({
    size,
    stroke,
    className,
    "aria-hidden": ariaHidden,
  }: {
    size?: number;
    stroke?: number;
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }) => (
    <svg
      data-testid="icon-external-link"
      data-size={size}
      data-stroke={stroke}
      data-class-name={className}
      aria-hidden={ariaHidden}
    />
  ),
}));

import { ExternalLink } from "../external-link.component";

describe("ExternalLink Component Test", () => {
  it("Should render an external anchor with visible text and screen-reader text", () => {
    render(
      <ExternalLink href="https://www2.gov.bc.ca/">Service BC</ExternalLink>,
    );

    const link = screen.getByRole("link", { name: /service bc/i });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://www2.gov.bc.ca/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByText("Service BC")).toBeInTheDocument();
    expect(screen.getByText("(opens in a new tab)")).toBeInTheDocument();
  });

  it("Should merge base classes with a custom class name", () => {
    render(
      <ExternalLink
        href="https://www2.gov.bc.ca/"
        className="text-primary underline"
      >
        Ministry resources
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: /ministry resources/i });
    const text = screen.getByText("Ministry resources");

    expect(link).toHaveClass("flex", "items-center", "gap-2");
    expect(link).toHaveClass("text-primary", "underline");
    expect(text).toHaveClass("truncate");
  });

  it("Should render the external-link icon with the expected props", () => {
    render(
      <ExternalLink href="https://www2.gov.bc.ca/">Open resource</ExternalLink>,
    );

    const icon = screen.getByTestId("icon-external-link");

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("data-size", "16");
    expect(icon).toHaveAttribute("data-stroke", "1.5");
    expect(icon).toHaveAttribute("data-class-name", "shrink-0");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
