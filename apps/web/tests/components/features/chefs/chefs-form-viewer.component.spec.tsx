import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ChefsFormViewer } from "src/features/chefs/components/chefs-form-viewer.component";
import { useChefsScript } from "src/features/chefs/hooks/use-chefs-script.hook";

jest.mock("@repo/ui", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <div data-testid="spinner" className={className}>
      spinner
    </div>
  ),
}));

jest.mock("src/features/chefs/hooks/use-chefs-script.hook", () => ({
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

  it("Should inject custom shadow styles when shadowRoot appears via MutationObserver and disconnect observer", async () => {
    mockedUseChefsScript.mockReturnValue("loading");

    const OriginalMutationObserver = global.MutationObserver;

    class MockMutationObserver {
      static instances: MockMutationObserver[] = [];
      private callback: MutationCallback;
      observe = jest.fn((target: Node) => {
        const targetEl = target as Element | null;

        const host =
          targetEl?.tagName?.toLowerCase() === "chefs-form-viewer"
            ? (targetEl as HTMLElement)
            : ((targetEl?.querySelector?.(
                "chefs-form-viewer",
              ) as HTMLElement | null) ?? null);

        if (
          host &&
          !host.shadowRoot &&
          typeof host.attachShadow === "function"
        ) {
          host.attachShadow({ mode: "open" });
        }

        this.callback([], this as unknown as MutationObserver);
      });
      disconnect = jest.fn();
      takeRecords = jest.fn(() => []);

      constructor(callback: MutationCallback) {
        this.callback = callback;
        MockMutationObserver.instances.push(this);
      }
    }

    global.MutationObserver =
      MockMutationObserver as unknown as typeof MutationObserver;

    const { container } = render(
      <ChefsFormViewer formId="shadow-style-form" authToken="token" />,
    );

    const viewer = getViewer(container) as HTMLElement;
    expect(viewer).toBeInTheDocument();

    await waitFor(() => {
      const styleEl = viewer.shadowRoot?.querySelector("#chefs-custom-styles");
      expect(styleEl).toBeInTheDocument();
    });

    const styleEls = viewer.shadowRoot?.querySelectorAll(
      "#chefs-custom-styles",
    );
    expect(styleEls).toHaveLength(1);
    expect(styleEls?.[0].textContent).toContain("transition: none !important");
    expect(styleEls?.[0].textContent).toContain(".v-container.main");

    expect(MockMutationObserver.instances[0].observe).toHaveBeenCalled();
    expect(MockMutationObserver.instances[0].disconnect).toHaveBeenCalled();

    global.MutationObserver = OriginalMutationObserver;
  });

  it("Should safely return when ready state has no chefs-form-viewer node", () => {
    mockedUseChefsScript.mockReturnValue("ready");

    const originalQuerySelector = Element.prototype.querySelector;
    const querySpy = jest
      .spyOn(Element.prototype, "querySelector")
      .mockImplementation(function (this: Element, selectors: string) {
        if (selectors === "chefs-form-viewer") {
          return null;
        }
        return originalQuerySelector.call(this, selectors);
      });

    render(<ChefsFormViewer formId="no-viewer-form" authToken="token" />);

    expect(screen.getByText("Loading form...")).toBeInTheDocument();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();

    querySpy.mockRestore();
  });

  it("Should mark form mounted from existing shadowRoot children without formio:ready event", async () => {
    mockedUseChefsScript.mockReturnValue("ready");

    const onFormReadyA = jest.fn();
    const onFormReadyB = jest.fn();

    const { container, rerender } = render(
      <ChefsFormViewer
        formId="existing-shadow-root-form"
        authToken="token"
        onFormReady={onFormReadyA}
      />,
    );

    const viewer = getViewer(container) as HTMLElement;
    expect(viewer).toBeInTheDocument();

    const shadowRoot = viewer.attachShadow({ mode: "open" });
    shadowRoot.appendChild(document.createElement("div"));

    rerender(
      <ChefsFormViewer
        formId="existing-shadow-root-form"
        authToken="token"
        onFormReady={onFormReadyB}
      />,
    );

    await waitFor(() => {
      expect(viewer.parentElement).toHaveClass("block");
    });

    expect(onFormReadyA).not.toHaveBeenCalled();
    expect(onFormReadyB).not.toHaveBeenCalled();
  });

  it("Should call load() and swallow rejected promise without crashing", async () => {
    mockedUseChefsScript.mockReturnValue("ready");

    const { container, rerender } = render(
      <ChefsFormViewer formId="load-reject-form" authToken="token" />,
    );

    const viewer = getViewer(container) as HTMLElement & {
      load?: () => Promise<void>;
    };
    expect(viewer).toBeInTheDocument();

    const loadMock = jest.fn().mockRejectedValue(new Error("load failed"));
    viewer.load = loadMock;

    rerender(
      <ChefsFormViewer
        formId="load-reject-form"
        authToken="token"
        onSubmissionError={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(loadMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Loading form...")).toBeInTheDocument();
  });
});
