import { cleanup, render, screen } from "@testing-library/react";
import { ApplicationProcessSkeleton } from "src/features/services/components/application-process-skeleton.component";

describe("<ApplicationProcessSkeleton />", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render a list with the loading aria-label and aria-busy=true", () => {
    render(<ApplicationProcessSkeleton />);
    const list = screen.getByRole("list", {
      name: "Loading application process",
    });
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("aria-busy", "true");
  });

  it("Should render three placeholder list items", () => {
    render(<ApplicationProcessSkeleton />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
