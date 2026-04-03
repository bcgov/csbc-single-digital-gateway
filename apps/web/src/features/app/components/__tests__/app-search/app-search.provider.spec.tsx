import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  AppSearchProvider,
  useAppSearch,
} from "../../app-search/app-search.context";

const AppSearchConsumer = () => {
  const { open, setOpen } = useAppSearch();

  return (
    <div>
      <span data-testid="open-state">{String(open)}</span>
      <button onClick={() => setOpen(true)}>Open</button>
      <button onClick={() => setOpen(false)}>Close</button>
    </div>
  );
};

const HookOnlyConsumer = () => {
  useAppSearch();
  return null;
};

describe("AppSearchProvider Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render children inside AppSearchProvider", () => {
    render(
      <AppSearchProvider>
        <div>Child Content</div>
      </AppSearchProvider>,
    );

    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("Should provide open as false by default", () => {
    render(
      <AppSearchProvider>
        <AppSearchConsumer />
      </AppSearchProvider>,
    );

    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
  });

  it("Should set open to true when setOpen(true) is called", () => {
    render(
      <AppSearchProvider>
        <AppSearchConsumer />
      </AppSearchProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(screen.getByTestId("open-state")).toHaveTextContent("true");
  });

  it("Should set open back to false when setOpen(false) is called", () => {
    render(
      <AppSearchProvider>
        <AppSearchConsumer />
      </AppSearchProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByTestId("open-state")).toHaveTextContent("true");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
  });

  it("Should throw when useAppSearch is used outside AppSearchProvider", () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<HookOnlyConsumer />)).toThrow(
      "useAppSearch must be used within an AppSearchProvider",
    );

    consoleErrorSpy.mockRestore();
  });
});
