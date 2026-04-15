import { cleanup, render, screen, within } from "@testing-library/react";
import { eligibilityCriteria } from "src/features/services/components/eligibility-criteria.placeholder";

jest.mock("@tabler/icons-react", () => ({
  IconCake: ({ size, stroke }: { size?: number; stroke?: number }) => (
    <svg
      data-testid="icon-cake"
      data-size={size}
      data-stroke={stroke}
      aria-hidden="true"
    />
  ),
}));

const renderEligibilityCriteria = () =>
  render(
    <div>
      {eligibilityCriteria.map((criterion, index) => (
        <section
          key={criterion.title}
          data-testid={`criterion-${index}`}
          aria-label={criterion.title}
        >
          <div>{criterion.icon}</div>
          <h2>{criterion.title}</h2>
          <div>{criterion.description}</div>
        </section>
      ))}
    </div>,
  );

describe("Eligibility Criteria Placeholder Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should export the expected eligibility criteria structure", () => {
    expect(eligibilityCriteria).toHaveLength(8);

    expect(eligibilityCriteria.map((criterion) => criterion.title)).toEqual([
      "Age",
      "Citizenship",
      "Residency",
      "Shelter status",
      "Employment status",
      "Income level",
      "Marital status",
      "Other factors",
    ]);

    eligibilityCriteria.forEach((criterion) => {
      expect(criterion.icon).toBeTruthy();
      expect(criterion.title).toBeTruthy();
      expect(criterion.description).toBeTruthy();
    });
  });

  it("Should render all titles, icons, and rich placeholder description content", () => {
    renderEligibilityCriteria();

    expect(screen.getAllByTestId("icon-cake")).toHaveLength(8);

    expect(screen.getByRole("heading", { name: "Age" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Citizenship" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Residency" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Shelter status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Employment status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Income level" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Marital status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Other factors" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Income Assistance is designed to support adults who are legally able/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/To start the application: 17.5 years and above/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Valid work permit holder, or/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You've lived in BC for a minimum of 3 years/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Unhoused, or/i)).toBeInTheDocument();
    expect(screen.getByText(/^Unemployed$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Household income: Up to \$10,000/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Living common-law/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You're waiting for other sources of money to arrive/i),
    ).toBeInTheDocument();
  });

  it("Should preserve nested list semantics and expected item counts per section", () => {
    renderEligibilityCriteria();

    const ageSection = within(screen.getByTestId("criterion-0"));
    const citizenshipSection = within(screen.getByTestId("criterion-1"));
    const shelterSection = within(screen.getByTestId("criterion-3"));
    const otherFactorsSection = within(screen.getByTestId("criterion-7"));

    expect(ageSection.getAllByRole("listitem")).toHaveLength(2);
    expect(
      ageSection.getByText(
        /To be eligible for the program: 18 years and above/i,
      ),
    ).toBeInTheDocument();

    expect(citizenshipSection.getAllByRole("listitem")).toHaveLength(3);
    expect(
      citizenshipSection.getByText(/Citizen, or permanent resident, or/i),
    ).toBeInTheDocument();
    expect(
      citizenshipSection.getByText(/Refugee or protected person/i),
    ).toBeInTheDocument();

    expect(shelterSection.getAllByRole("listitem")).toHaveLength(5);
    expect(
      shelterSection.getByText(/Living in subsidized housing/i),
    ).toBeInTheDocument();
    expect(
      shelterSection.getByText(/Staying in temporary accommodation/i),
    ).toBeInTheDocument();

    expect(otherFactorsSection.getAllByRole("listitem")).toHaveLength(5);
    expect(
      otherFactorsSection.getByText(
        /You urgently need food, shelter or medical attention/i,
      ),
    ).toBeInTheDocument();
    expect(
      otherFactorsSection.getByText(
        /You must look for and use all other sources of income and assets before you apply/i,
      ),
    ).toBeInTheDocument();
  });
});
