import { render, screen } from "@testing-library/react";
import { AuthenticatedHeader } from "src/features/app/components/authenticated-layout/authenticated-header.component";

describe("AuthenticatedHeader Component Test", () => {
  it("Should render a header element", () => {
    const { container } = render(<AuthenticatedHeader />);
    const header = container.querySelector("header");

    expect(header).toBeInTheDocument();
  });

  it("Should apply the expected header classes", () => {
    const { container } = render(<AuthenticatedHeader />);
    const header = container.querySelector("header");

    expect(header).toHaveClass("border-b");
    expect(header).toHaveClass("border-neutral-300");
    expect(header).toHaveClass("mb-4");
  });

  it("Should render children inside the header", () => {
    const { container } = render(
      <AuthenticatedHeader>
        <div>Header Content</div>
      </AuthenticatedHeader>,
    );

    const header = container.querySelector("header");

    expect(screen.getByText("Header Content")).toBeInTheDocument();
    expect(header).toContainElement(screen.getByText("Header Content"));
  });

  it("Should render successfully without children", () => {
    const { container } = render(<AuthenticatedHeader />);
    const header = container.querySelector("header");

    expect(header).toBeInTheDocument();
    expect(header).toBeEmptyDOMElement();
  });
});
