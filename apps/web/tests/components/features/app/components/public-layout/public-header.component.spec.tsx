import { cleanup, render, screen } from "@testing-library/react";
import { PublicHeader } from "src/features/app/components/public-layout/public-header.component";

describe("PublicHeader Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render a semantic header element", () => {
    render(<PublicHeader />);

    const header = screen.getByRole("banner");

    expect(header).toBeInTheDocument();
    expect(header).toBeEmptyDOMElement();
  });

  it("Should render children inside the header", () => {
    render(
      <PublicHeader>
        <h1>Public Portal</h1>
        <button type="button">Sign in</button>
      </PublicHeader>,
    );

    const header = screen.getByRole("banner");

    expect(header).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Public Portal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(header).toContainElement(
      screen.getByRole("heading", { name: "Public Portal" }),
    );
    expect(header).toContainElement(
      screen.getByRole("button", { name: "Sign in" }),
    );
  });
});
