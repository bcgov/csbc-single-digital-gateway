import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockedUseAppSearch } from "tests/utils/mocks/app/features/mock.useAppSearch";
import { mockedUseBcscAuth } from "tests/utils/mocks/auth/mock.useBcscAuth";
import { AuthenticatedNavigationBar } from "../../authenticated-layout/authenticated-navigation-bar.component";

jest.mock("@tabler/icons-react", () => ({
  IconLogout: () => <svg data-testid="icon-logout" />,
  IconSearch: () => <svg data-testid="icon-search" />,
}));

jest.mock("@repo/ui", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar">{children}</div>
  ),
  AvatarFallback: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
  AvatarImage: ({ src }: { src?: string }) => <img alt="avatar" src={src} />,
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ render }: { render: React.ReactNode }) => (
    <>{render}</>
  ),
}));

jest.mock("../../navigation-bar", () => ({
  NavigationBar: ({
    title,
    items,
    extras,
  }: {
    title: string;
    items: Array<{ label: string }>;
    extras: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <nav>
        {items.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </nav>
      <div>{extras}</div>
    </div>
  ),
}));

describe("AuthenticatedNavigationBar Component Test", () => {
  const mountAuthenticatedNavigationBar = (overrides?: {
    name?: string;
    email?: string;
    picture?: string;
  }) => {
    const setOpen = jest.fn();
    const logout = jest.fn();

    mockedUseAppSearch.mockReturnValue({ setOpen });
    mockedUseBcscAuth.mockReturnValue({
      user: {
        name: "Jane Doe",
        email: "jane.doe@example.com",
        picture: "https://example.com/avatar.jpg",
        ...overrides,
      },
      logout,
    });

    render(<AuthenticatedNavigationBar />);

    return { setOpen, logout };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Should render title and navigation items", () => {
    mountAuthenticatedNavigationBar();

    expect(screen.getByText("Single Digital Gateway")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("Should call setOpen(true) when search button is clicked", async () => {
    const user = userEvent.setup();
    const { setOpen } = mountAuthenticatedNavigationBar();

    await user.click(screen.getByRole("button", { name: "Open search" }));
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(setOpen).toHaveBeenCalledTimes(1);
  });

  it("Should call logout when Sign out is clicked", async () => {
    const user = userEvent.setup();
    const { logout } = mountAuthenticatedNavigationBar();

    await user.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("Should use name as display label when available", () => {
    mountAuthenticatedNavigationBar({
      name: "Jane Doe",
      email: "jane.doe@example.com",
    });
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("Should fall back to email as display label when name is missing", () => {
    mountAuthenticatedNavigationBar({
      name: undefined,
      email: "alex@example.com",
    });
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
  });

  it("Should fall back to 'User' when name and email are missing", () => {
    mountAuthenticatedNavigationBar({ name: undefined, email: undefined });
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("Should show initials from first and last name", () => {
    mountAuthenticatedNavigationBar({
      name: "Jane Doe",
      email: "jane.doe@example.com",
    });
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("Should show initials from single name", () => {
    mountAuthenticatedNavigationBar({
      name: "Prince",
      email: "prince@example.com",
    });
    expect(screen.getByText("PR")).toBeInTheDocument();
  });

  it("Should fall back to email initials when name is missing", () => {
    mountAuthenticatedNavigationBar({
      name: undefined,
      email: "alex@example.com",
    });
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("Should fall back to 'U' when both name and email are missing", () => {
    mountAuthenticatedNavigationBar({ name: undefined, email: undefined });
    expect(screen.getByText("U")).toBeInTheDocument();
  });
});
