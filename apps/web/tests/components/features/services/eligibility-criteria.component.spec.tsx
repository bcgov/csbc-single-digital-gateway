import { cleanup, render, screen } from "@testing-library/react";
import {
  EligibilityCriteria,
  type EligibilityCriterion,
} from "src/features/services/components/eligibility-criteria.component";

describe("EligibilityCriteria Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  const criteria: EligibilityCriterion[] = [
    {
      icon: <svg data-testid="icon-age" />,
      title: "Be 19 years or older",
      description: "Applicants must be at least 19 years old.",
    },
    {
      icon: <svg data-testid="icon-residency" />,
      title: "Live in British Columbia",
      description: (
        <p>
          Applicants must currently reside in <strong>British Columbia</strong>.
        </p>
      ),
    },
  ];

  it("Should render all eligibility criteria with icons, titles, descriptions, and grid cells", () => {
    const { container } = render(<EligibilityCriteria criteria={criteria} />);

    expect(screen.getByTestId("icon-age")).toBeInTheDocument();
    expect(screen.getByTestId("icon-residency")).toBeInTheDocument();

    expect(screen.getByText("Be 19 years or older")).toBeInTheDocument();
    expect(screen.getByText("Live in British Columbia")).toBeInTheDocument();

    expect(
      screen.getByText("Applicants must be at least 19 years old."),
    ).toBeInTheDocument();
    expect(screen.getByText("British Columbia")).toBeInTheDocument();

    const grid = container.querySelector(".grid.grid-cols-3.gap-px");
    expect(grid).toBeInTheDocument();
    expect(grid?.childElementCount).toBe(criteria.length * 2);

    expect(container.querySelectorAll(".bg-white")).toHaveLength(
      criteria.length * 2,
    );
  });

  it("Should render rich ReactNode description content", () => {
    render(
      <EligibilityCriteria
        criteria={[
          {
            icon: <svg data-testid="icon-documents" />,
            title: "Provide supporting documents",
            description: (
              <div>
                Review the <strong>required documents</strong> before applying.
                <a href="/services/documents"> Learn more</a>
              </div>
            ),
          },
        ]}
      />,
    );

    expect(screen.getByTestId("icon-documents")).toBeInTheDocument();
    expect(
      screen.getByText("Provide supporting documents"),
    ).toBeInTheDocument();
    expect(screen.getByText("required documents")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /learn more/i })).toHaveAttribute(
      "href",
      "/services/documents",
    );
  });

  it("Should render only the wrapper structure when criteria is empty", () => {
    const { container } = render(<EligibilityCriteria criteria={[]} />);

    expect(container.firstChild).toBeInTheDocument();
    expect(
      container.querySelector(".flex.flex-col.gap-px.border.bg-border"),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".grid.grid-cols-3.gap-px"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".bg-white")).toHaveLength(0);

    expect(screen.queryByText("Be 19 years or older")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Applicants must be at least 19 years old."),
    ).not.toBeInTheDocument();
  });
});
