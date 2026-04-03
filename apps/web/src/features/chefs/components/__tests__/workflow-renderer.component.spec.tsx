import { cleanup, render, screen } from "@testing-library/react";
import type { ApplicationDto } from "../../../services/service.dto";
import { WorkflowRenderer } from "../workflow-renderer.component";

describe("WorkflowRenderer Component Test", () => {
  const application = {
    label: "Test Workflow Application",
  } as ApplicationDto;

  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    cleanup();
  });

  it("Should render the application label", () => {
    render(<WorkflowRenderer application={application} />);

    expect(
      screen.getByRole("heading", { name: "Test Workflow Application" }),
    ).toBeInTheDocument();
  });

  it("Should render the unsupported workflow fallback message", () => {
    render(<WorkflowRenderer application={application} />);

    expect(
      screen.getByText(
        "Workflow applications are not yet supported. Please check back later.",
      ),
    ).toBeInTheDocument();
  });

  it("Should render with expected root layout classes", () => {
    render(<WorkflowRenderer application={application} />);

    const heading = screen.getByRole("heading", {
      name: "Test Workflow Application",
    });
    const root = heading.closest("div");

    expect(root).toBeInTheDocument();
    expect(root).toHaveClass("flex");
    expect(root).toHaveClass("flex-col");
    expect(root).toHaveClass("items-center");
    expect(root).toHaveClass("justify-center");
    expect(root).toHaveClass("gap-4");
    expect(root).toHaveClass("rounded-lg");
    expect(root).toHaveClass("border");
    expect(root).toHaveClass("border-dashed");
    expect(root).toHaveClass("p-12");
    expect(root).toHaveClass("text-center");
  });

  it("Should accept optional submission callbacks without invoking them", () => {
    const onSubmissionComplete = jest.fn();
    const onSubmissionError = jest.fn();

    render(
      <WorkflowRenderer
        application={application}
        onSubmissionComplete={onSubmissionComplete}
        onSubmissionError={onSubmissionError}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Test Workflow Application" }),
    ).toBeInTheDocument();
    expect(onSubmissionComplete).not.toHaveBeenCalled();
    expect(onSubmissionError).not.toHaveBeenCalled();
  });

  it("Should log the application payload to console", () => {
    render(<WorkflowRenderer application={application} />);

    expect(consoleLogSpy).toHaveBeenCalledWith(">> application: ", application);
  });
});
