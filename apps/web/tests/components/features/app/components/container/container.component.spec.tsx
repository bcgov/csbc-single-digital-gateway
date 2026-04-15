import { cleanup, render, screen } from "@testing-library/react";
import { Container } from "src/features/app/components/container.component";

describe("Container Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render outer and inner wrappers with children", () => {
    const { container } = render(
      <Container>
        <p>Inner content</p>
      </Container>,
    );

    const outer = container.firstElementChild as HTMLDivElement;
    const inner = outer.firstElementChild as HTMLDivElement;
    const child = screen.getByText("Inner content");

    expect(outer).toBeInTheDocument();
    expect(inner).toBeInTheDocument();
    expect(child).toBeInTheDocument();
    expect(inner).toContainElement(child);
  });

  it("Should apply base class and custom className on outer wrapper", () => {
    const { container } = render(
      <Container className="custom-layout">
        <span>Content</span>
      </Container>,
    );

    const outer = container.firstElementChild as HTMLDivElement;

    expect(outer).toBeInTheDocument();
    expect(outer.className).toContain("@container");
    expect(outer.className).toContain("custom-layout");
  });

  it("Should render correctly without children", () => {
    const { container } = render(<Container />);

    const outer = container.firstElementChild as HTMLDivElement;
    const inner = outer.firstElementChild as HTMLDivElement;

    expect(outer).toBeInTheDocument();
    expect(inner).toBeInTheDocument();
    expect(inner).toBeEmptyDOMElement();
  });

  it("Should keep expected layout utility classes on inner wrapper", () => {
    const { container } = render(
      <Container>
        <div>Layout content</div>
      </Container>,
    );

    const outer = container.firstElementChild as HTMLDivElement;
    const inner = outer.firstElementChild as HTMLDivElement;

    expect(inner).toBeInTheDocument();
    expect(inner.className).toContain("mx-4");
    expect(inner.className).toContain("md:mx-8");
    expect(inner.className).toContain("xl:mx-auto");
    expect(inner.className).toContain("max-w-280");
  });
});
