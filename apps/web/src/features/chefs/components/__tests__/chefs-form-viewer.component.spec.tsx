import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useChefsScript } from "../../hooks/use-chefs-script.hook";
import { ChefsFormViewer } from "../chefs-form-viewer.component";

jest.mock("@repo/ui", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      spinner
    </div>
  ),
}));

jest.mock("../../hooks/use-chefs-script.hook", () => ({
  useChefsScript: jest.fn(),
}));

const mockedUseChefsScript = useChefsScript as jest.MockedFunction<
  typeof useChefsScript
>;

const getViewer = (container: HTMLElement): HTMLElement | null =>
  container.querySelector("chefs-form-viewer");

describe("ChefsFormViewer Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render error UI when script fails to load", () => {
    mockedUseChefsScript.mockReturnValue("error");

    const { container } = render(
      <ChefsFormViewer formId="test-form-id" authToken="token" />,
    );

    expect(
      screen.getByText("Failed to load form. Please try refreshing the page."),
    ).toBeInTheDocument();
    expect(getViewer(container)).toBeNull();
  });

  it("Should show loading state while script is loading and keep form container hidden", () => {
    mockedUseChefsScript.mockReturnValue("loading");

    const { container } = render(
      <ChefsFormViewer formId="test-form-id" authToken="token" />,
    );

    expect(screen.getByText("Loading form...")).toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    const viewer = getViewer(container);
    expect(viewer).toBeInTheDocument();
    expect(viewer?.parentElement).toHaveClass("hidden");
  });

  it("Should render chefs-form-viewer with expected attributes including encoded headers", () => {
    mockedUseChefsScript.mockReturnValue("ready");

    const headers = {
      "x-test": "value with spaces",
      nested: { a: 1 },
    } as never;

    const { container } = render(
      <ChefsFormViewer
        formId="form-123"
        authToken="auth-abc"
        apiKey="api-xyz"
        headers={headers}
        submissionId="sub-789"
        readOnly
        language="fr"
        isolateStyles
        baseUrl="https://submit.example.com/app"
      />,
    );

    const viewer = getViewer(container);
    expect(viewer).toBeInTheDocument();

    expect(viewer).toHaveAttribute("form-id", "form-123");
    expect(viewer).toHaveAttribute(
      "base-url",
      "https://submit.example.com/app",
    );
    expect(viewer).toHaveAttribute("auth-token", "auth-abc");
    expect(viewer).toHaveAttribute("api-key", "api-xyz");
    expect(viewer).toHaveAttribute("submission-id", "sub-789");
    expect(viewer).toHaveAttribute("read-only", "true");
    expect(viewer).toHaveAttribute("language", "fr");
    expect(viewer).toHaveAttribute("isolate-styles", "true");
    expect(viewer).toHaveAttribute(
      "headers",
      encodeURIComponent(JSON.stringify(headers)),
    );
  });

  it("Should wire custom events and update mounted state on formio:ready", async () => {
    mockedUseChefsScript.mockReturnValue("ready");

    const onFormReady = jest.fn();
    const onSubmissionComplete = jest.fn();
    const onSubmissionError = jest.fn();

    const { container } = render(
      <ChefsFormViewer
        formId="form-123"
        authToken="token"
        onFormReady={onFormReady}
        onSubmissionComplete={onSubmissionComplete}
        onSubmissionError={onSubmissionError}
      />,
    );

    const viewer = getViewer(container);
    expect(viewer).toBeInTheDocument();

    viewer?.dispatchEvent(new Event("formio:ready"));
    expect(onFormReady).toHaveBeenCalledWith({ formio: null });

    await waitFor(() => {
      expect(viewer?.parentElement).toHaveClass("block");
    });

    const submitDetail = { submissionId: "S-1" };
    viewer?.dispatchEvent(
      new CustomEvent("formio:submit", { detail: submitDetail }),
    );
    expect(onSubmissionComplete).toHaveBeenCalledWith(submitDetail);

    const errorDetail = { message: "submit failed" };
    viewer?.dispatchEvent(
      new CustomEvent("formio:submitError", { detail: errorDetail }),
    );
    expect(onSubmissionError).toHaveBeenCalledWith(errorDetail);
  });

  it("Should set headers object directly on the web component in ready state", () => {
    mockedUseChefsScript.mockReturnValue("ready");

    const headers = {
      Authorization: "Bearer token",
      context: { env: "test" },
    } as never;

    const { container } = render(
      <ChefsFormViewer
        formId="form-headers"
        authToken="token"
        headers={headers}
      />,
    );

    const viewer = getViewer(container) as HTMLElement & {
      headers?: Record<string, unknown>;
    };

    expect(viewer).toBeInTheDocument();
    expect(viewer.headers).toEqual(headers);
  });
});
