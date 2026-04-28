import { cleanup, render, screen } from "@testing-library/react";

jest.mock("@tabler/icons-react", () => ({
  IconLoader2: ({
    className,
    size,
    stroke,
    "aria-hidden": ariaHidden,
  }: {
    className?: string;
    size?: number;
    stroke?: number;
    "aria-hidden"?: boolean | "true" | "false";
  }) => (
    <svg
      data-testid="icon-loader-2"
      data-size={size}
      data-stroke={stroke}
      className={className}
      aria-hidden={ariaHidden}
    />
  ),
}));

import { StartingApplicationLoader } from "src/features/services/components/starting-application-loader.component";

describe("StartingApplicationLoader", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the IconLoader2 spinner with an animate-spin class", () => {
    render(<StartingApplicationLoader />);

    const spinner = screen.getByTestId("icon-loader-2");

    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveAttribute("aria-hidden", "true");
  });

  it("Should render the default message 'Starting your application…' when no message prop is provided", () => {
    render(<StartingApplicationLoader />);

    expect(screen.getByText("Starting your application…")).toBeInTheDocument();
  });

  it("Should render the provided message when the message prop is supplied", () => {
    render(<StartingApplicationLoader message="Submitting…" />);

    expect(screen.getByText("Submitting…")).toBeInTheDocument();
    expect(
      screen.queryByText("Starting your application…"),
    ).not.toBeInTheDocument();
  });

  it("Should render the spinner and message inside a centered container", () => {
    render(<StartingApplicationLoader />);

    const container = screen.getByTestId("starting-application-loader");

    expect(container).toBeInTheDocument();
    expect(container).toHaveClass(
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
    );
    expect(container).toContainElement(screen.getByTestId("icon-loader-2"));
    expect(container).toContainElement(
      screen.getByText("Starting your application…"),
    );
  });
});
