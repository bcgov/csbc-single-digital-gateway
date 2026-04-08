import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockedUseAppSearch } from "tests/utils/mocks/app/features/mock.useAppSearch";
import { AppSearch } from "../../app-search";
import type { NavItem } from "../../navigation-bar";

const mockNavigate = jest.fn();

jest.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@repo/ui", () => ({
  Command: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (
    <div data-open={String(open)} data-testid="command-dialog">
      {children}
    </div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading: string;
  }) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  ),
  CommandInput: ({ placeholder }: { placeholder?: string }) => (
    <input placeholder={placeholder} />
  ),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => <button onClick={onSelect}>{children}</button>,
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CommandShortcut: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("AppSearch Component Test", () => {
  const navigationItems = [
    {
      type: "link",
      label: "Home",
      to: "/home",
      icon: <svg data-testid="icon-home" />,
    },
    {
      type: "menu",
      label: "Services",
      icon: <svg data-testid="icon-services" />,
      children: [
        { label: "Applications", to: "/applications" },
        { label: "Settings", to: "/settings" },
      ] as never[],
    },
  ] as NavItem[];

  const mountAppSearch = (open = false) => {
    const setOpen = jest.fn();

    mockedUseAppSearch.mockReturnValue({
      open,
      setOpen,
    });

    render(<AppSearch navigationItems={navigationItems} />);

    return { setOpen };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render command dialog content and navigation items", () => {
    mountAppSearch();

    expect(screen.getByTestId("command-dialog")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    expect(screen.getByText("No results found.")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Applications/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Settings/i }),
    ).toBeInTheDocument();
  });

  it("Should close search and navigate when a link item is selected", async () => {
    const user = userEvent.setup();
    const { setOpen } = mountAppSearch();

    await user.click(screen.getByRole("button", { name: "Home" }));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/home" });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("Should close search and navigate when a nested item is selected", async () => {
    const user = userEvent.setup();
    const { setOpen } = mountAppSearch();

    await user.click(screen.getByRole("button", { name: /Applications/i }));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/applications" });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("Should open search when Ctrl+K is pressed while closed", () => {
    const { setOpen } = mountAppSearch(false);

    fireEvent.keyDown(document, {
      key: "k",
      ctrlKey: true,
    });

    expect(setOpen).toHaveBeenCalledWith(true);
    expect(setOpen).toHaveBeenCalledTimes(1);
  });

  it("Should close search when Meta+K is pressed while open", () => {
    const { setOpen } = mountAppSearch(true);

    fireEvent.keyDown(document, {
      key: "k",
      metaKey: true,
    });

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(setOpen).toHaveBeenCalledTimes(1);
  });

  it("Should not change search state for unrelated key presses", () => {
    const { setOpen } = mountAppSearch(false);

    fireEvent.keyDown(document, {
      key: "Enter",
      ctrlKey: true,
    });

    expect(setOpen).not.toHaveBeenCalled();
  });
});
