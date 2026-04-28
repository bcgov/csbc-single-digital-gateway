import { cleanup, render, screen } from "@testing-library/react";
import { YourActivitySkeleton } from "src/features/services/components/your-activity-skeleton.component";

describe("<YourActivitySkeleton />", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render a list with the loading aria-label and aria-busy=true", () => {
    render(<YourActivitySkeleton />);
    const list = screen.getByRole("list", {
      name: "Loading your applications",
    });
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("aria-busy", "true");
  });

  it("Should render three placeholder list items", () => {
    render(<YourActivitySkeleton />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
