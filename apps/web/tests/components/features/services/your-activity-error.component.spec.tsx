import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { YourActivityError } from "src/features/services/components/your-activity-error.component";

describe("YourActivityError Component Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("Should render the 'Couldn't load your applications.' copy", () => {
    render(<YourActivityError onRetry={() => undefined} />);

    expect(
      screen.getByText("Couldn't load your applications."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("Should call onRetry when the 'Try again' button is clicked", () => {
    const onRetry = jest.fn();
    render(<YourActivityError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
