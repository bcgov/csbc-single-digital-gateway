import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// ── Mocks must be declared before any imports that pull in the component ──

jest.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

let mockUseIdirAuth = jest.fn();

jest.mock("src/features/auth/auth.context", () => ({
  useIdirAuth: () => mockUseIdirAuth(),
}));

jest.mock("@repo/ui", () => ({
  Button: ({ children, onClick, variant, size, render: renderProp, ...props }: any) => {
    // Some Buttons use a render prop pattern — forward it
    if (renderProp && typeof renderProp === "function") {
      return <div {...props}>{renderProp()}</div>;
    }
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
  Sheet: ({ children, open, onOpenChange }: any) => (
    <div data-testid="sheet" data-open={String(open ?? false)}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children, render: renderProp }: any) => {
    if (renderProp) return <div data-testid="sheet-trigger">{renderProp}</div>;
    return <div data-testid="sheet-trigger">{children}</div>;
  },
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  Avatar: ({ children }: any) => <div data-testid="avatar">{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, render: renderProp }: any) => {
    if (renderProp) return <div data-testid="dropdown-trigger">{renderProp}</div>;
    return <div data-testid="dropdown-trigger">{children}</div>;
  },
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <div role="menuitem" onClick={onClick} {...props}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// Tabler icons — replace with plain text to avoid SVG rendering issues in jsdom
jest.mock("@tabler/icons-react", () => ({
  IconChevronDown: () => <span data-testid="icon-chevron-down" />,
  IconLogout: () => <span data-testid="icon-logout" />,
  IconMenu2: () => <span data-testid="icon-menu2" />,
}));

// The SVG asset import
jest.mock("src/assets/brand/icon.svg", () => "icon.svg", { virtual: true });

import { AdminNavigationBar } from "src/features/admin/components/admin-navigation-bar.component";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jane Smith",
    given_name: "Jane",
    roles: [] as string[],
    ...overrides,
  };
}

function renderBar(userOverrides?: Record<string, unknown>) {
  mockUseIdirAuth.mockReturnValue({
    user: buildUser(userOverrides),
    logout: jest.fn(),
  });
  return render(<AdminNavigationBar />);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("AdminNavigationBar", () => {
  beforeEach(() => {
    mockUseIdirAuth = jest.fn();
  });

  afterEach(cleanup);

  describe("brand / logo", () => {
    it("should render the logo image", () => {
      renderBar();

      const logo = screen.getByRole("img", { name: "Logo" });
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("alt", "Logo");
    });
  });

  describe("desktop navigation items", () => {
    it("should render Dashboard nav link", () => {
      renderBar();

      expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    });

    it("should render Consent nav link", () => {
      renderBar();

      expect(screen.getAllByText("Consent").length).toBeGreaterThanOrEqual(1);
    });

    it("should render Services nav link", () => {
      renderBar();

      expect(screen.getAllByText("Services").length).toBeGreaterThanOrEqual(1);
    });

    it("should NOT render Settings nav link for a user without the admin role", () => {
      renderBar({ roles: [] });

      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("should render Settings nav link for a user with the admin role", () => {
      renderBar({ roles: ["admin"] });

      expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("mobile menu", () => {
    it("should render the mobile menu trigger button", () => {
      renderBar();

      // The SheetTrigger wraps a Button with aria-label="Open menu"
      const triggerArea = screen.getByTestId("sheet-trigger");
      expect(triggerArea).toBeInTheDocument();
    });

    it("should render mobile menu nav items inside SheetContent", () => {
      renderBar();

      const sheetContent = screen.getByTestId("sheet-content");
      expect(sheetContent).toBeInTheDocument();
      // Dashboard link should appear in the mobile drawer
      expect(sheetContent).toHaveTextContent("Dashboard");
    });

    it("should render Menu heading inside SheetContent", () => {
      renderBar();

      expect(screen.getByTestId("sheet-content")).toHaveTextContent("Menu");
    });
  });

  describe("AccountMenu", () => {
    it("should display the user's full name when available", () => {
      renderBar({ name: "Patricia Adams", given_name: "Patricia" });

      expect(screen.getByText("Patricia Adams")).toBeInTheDocument();
    });

    it("should fall back to given_name when name is undefined", () => {
      renderBar({ name: undefined, given_name: "Robert" });

      expect(screen.getByText("Robert")).toBeInTheDocument();
    });

    it("should fall back to 'Admin' when both name and given_name are undefined", () => {
      renderBar({ name: undefined, given_name: undefined });

      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("should render initials in the Avatar from the user's display name", () => {
      renderBar({ name: "Patricia Adams" });

      const avatar = screen.getByTestId("avatar");
      // "Patricia Adams" → initials "PA"
      expect(avatar).toHaveTextContent("PA");
    });

    it("should render initials from a single-word name", () => {
      renderBar({ name: "Administrator" });

      const avatar = screen.getByTestId("avatar");
      expect(avatar).toHaveTextContent("A");
    });

    it("should truncate initials to 2 characters for names with many parts", () => {
      renderBar({ name: "Mary Jane Watson Parker" });

      const avatar = screen.getByTestId("avatar");
      expect(avatar.textContent).toHaveLength(2);
      expect(avatar).toHaveTextContent("MJ");
    });

    it("should render the Sign out dropdown item", () => {
      renderBar();

      expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
    });

    it("should call logout when Sign out is clicked", () => {
      const logout = jest.fn();
      mockUseIdirAuth.mockReturnValue({
        user: buildUser(),
        logout,
      });
      render(<AdminNavigationBar />);

      fireEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));

      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
