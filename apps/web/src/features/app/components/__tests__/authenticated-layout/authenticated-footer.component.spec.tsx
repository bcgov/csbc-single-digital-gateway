import { cleanup, render, screen } from "@testing-library/react";
import { AuthenticatedFooter } from "../../authenticated-layout/authenticated-footer.component";

jest.mock("../../container.component", () => ({
  Container: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="container">{children}</div>
  ),
}));

describe("AuthenticatedFooter Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render a footer element", () => {
    const { container } = render(<AuthenticatedFooter />);
    const footer = container.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });

  it("Should apply py-4 class to the footer element", () => {
    const { container } = render(<AuthenticatedFooter />);
    const footer = container.querySelector("footer");
    expect(footer).toHaveClass("py-4");
  });

  it("Should render the Container component inside the footer", () => {
    render(<AuthenticatedFooter />);
    expect(screen.getByTestId("container")).toBeInTheDocument();
  });

  it("Should render Container nested within the footer element", () => {
    const { container } = render(<AuthenticatedFooter />);
    const footer = container.querySelector("footer");
    const containerEl = screen.getByTestId("container");
    expect(footer).toContainElement(containerEl);
  });
});
