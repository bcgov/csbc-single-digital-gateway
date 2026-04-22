import { cleanup, render, screen } from "@testing-library/react";

import { ApplicationPlaceholder } from "src/features/services/components/application-placeholder.component";

describe("ApplicationPlaceholder", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render an <h1> with copy 'Your application'", () => {
    render(<ApplicationPlaceholder applicationId="abc-123" />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: /your application/i,
    });

    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H1");
  });

  it("Should render the placeholder explanatory paragraph", () => {
    render(<ApplicationPlaceholder applicationId="abc-123" />);

    expect(
      screen.getByText(
        /this is a placeholder\. a full application status view is coming soon\./i,
      ),
    ).toBeInTheDocument();
  });

  it("Should render the applicationId prop inside a <code> element", () => {
    render(<ApplicationPlaceholder applicationId="abc-123" />);

    const code = screen.getByText("abc-123");

    expect(code).toBeInTheDocument();
    expect(code.tagName).toBe("CODE");
  });

  it("Should render a different applicationId when the prop changes", () => {
    const { rerender } = render(
      <ApplicationPlaceholder applicationId="abc-123" />,
    );
    expect(screen.getByText("abc-123")).toBeInTheDocument();

    rerender(<ApplicationPlaceholder applicationId="xyz-789" />);

    expect(screen.getByText("xyz-789")).toBeInTheDocument();
    expect(screen.queryByText("abc-123")).not.toBeInTheDocument();
  });
});
