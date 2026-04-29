import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockMutate = jest.fn();
let mockIsPending = false;
let mockUsers: Array<{ id: string; name: string | null; email: string }> = [];
let mockIsLoading = false;

jest.mock("src/features/admin/org-units/data/org-units.mutations", () => ({
  useAddMember: () => ({
    mutate: mockMutate,
    get isPending() {
      return mockIsPending;
    },
  }),
}));

jest.mock("src/features/admin/org-units/data/user-search.query", () => ({
  userSearchQueryOptions: (_orgUnitId: string, search: string) => ({
    queryKey: ["user-search", search],
    queryFn: () => [],
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    get data() {
      return mockUsers;
    },
    get isLoading() {
      return mockIsLoading;
    },
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@tabler/icons-react", () => ({
  IconX: () => <svg data-testid="icon-x" />,
}));

jest.mock("@repo/ui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  const DialogContext = React.createContext({ open: false, onOpenChange: null });

  return {
    Dialog: ({ open, onOpenChange, children }: any) => (
      <DialogContext.Provider value={{ open, onOpenChange }}>
        <div>{children}</div>
      </DialogContext.Provider>
    ),
    DialogTrigger: ({ children }: any) => {
      const ctx = React.useContext(DialogContext);
      return <span onClick={() => ctx.onOpenChange && ctx.onOpenChange(true)}>{children}</span>;
    },
    DialogContent: ({ children }: any) => {
      const ctx = React.useContext(DialogContext);
      return ctx.open ? <div role="dialog">{children}</div> : null;
    },
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    Button: ({ children, onClick, disabled, type, variant, size, ...props }: any) => (
      <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
    Select: ({ children, value, onValueChange }: any) => (
      <select
        data-testid="role-select"
        value={value}
        onChange={(e: any) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    Command: ({ children }: any) => <div data-testid="command">{children}</div>,
    CommandInput: ({ placeholder, value, onValueChange }: any) => (
      <input
        data-testid="command-input"
        placeholder={placeholder}
        value={value}
        onChange={(e: any) => onValueChange?.(e.target.value)}
      />
    ),
    CommandList: ({ children }: any) => <div>{children}</div>,
    CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
    CommandGroup: ({ children }: any) => <div>{children}</div>,
    CommandItem: ({ children, onSelect, value }: any) => (
      <div data-testid={`command-item-${value}`} onClick={onSelect} role="option">
        {children}
      </div>
    ),
  };
});

import { AddMemberDialog } from "src/features/admin/org-units/components/add-member-dialog.component";

const USERS = [
  { id: "user-aaa-111", name: "Alice Nguyen", email: "alice@gov.bc.ca" },
  { id: "user-bbb-222", name: null, email: "noid@gov.bc.ca" },
];

describe("AddMemberDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
    mockUsers = [];
    mockIsLoading = false;
  });

  afterEach(cleanup);

  const renderDialog = () =>
    render(
      <AddMemberDialog
        orgUnitId="org-unit-xyz"
        trigger={<button type="button">Open Add Member</button>}
      />,
    );

  const openDialog = () =>
    fireEvent.click(screen.getByRole("button", { name: "Open Add Member" }));

  it("does not render dialog content before trigger is clicked", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows dialog heading, search input, role select when opened", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Member" })).toBeInTheDocument();
    expect(screen.getByTestId("command-input")).toBeInTheDocument();
    expect(screen.getByTestId("role-select")).toBeInTheDocument();
  });

  it("defaults the role to 'member'", () => {
    renderDialog();
    openDialog();

    const select = screen.getByTestId("role-select") as HTMLSelectElement;
    expect(select.value).toBe("member");
  });

  it("submit button is disabled when no user is selected", () => {
    renderDialog();
    openDialog();

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeDisabled();
  });

  it("renders user results in the command list when users are available", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByTestId("command-input"), {
      target: { value: "alice" },
    });

    expect(screen.getByText("Alice Nguyen")).toBeInTheDocument();
    expect(screen.getByText("alice@gov.bc.ca")).toBeInTheDocument();
  });

  it("displays 'Unnamed user' for users with null name", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByTestId("command-input"), {
      target: { value: "noid" },
    });

    expect(screen.getByText("Unnamed user")).toBeInTheDocument();
    expect(screen.getByText("noid@gov.bc.ca")).toBeInTheDocument();
  });

  it("shows selected user info and hides command input after selection", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByTestId("command-item-user-aaa-111"));

    expect(screen.queryByTestId("command-input")).not.toBeInTheDocument();
    expect(screen.getByText("Alice Nguyen")).toBeInTheDocument();
    expect(screen.getByText("alice@gov.bc.ca")).toBeInTheDocument();
  });

  it("enables the submit button after a user is selected", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByTestId("command-item-user-aaa-111"));

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).not.toBeDisabled();
  });

  it("clears selected user when X button is clicked", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByTestId("command-item-user-aaa-111"));
    expect(screen.queryByTestId("command-input")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("icon-x").closest("button")!);

    expect(screen.getByTestId("command-input")).toBeInTheDocument();
  });

  it("calls mutate with correct userId and role on submit", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByTestId("command-item-user-aaa-111"));

    fireEvent.change(screen.getByTestId("role-select"), {
      target: { value: "admin" },
    });

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { userId: "user-aaa-111", role: "admin" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("disables the submit button and shows Adding text when isPending", () => {
    mockIsPending = true;
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByTestId("command-item-user-aaa-111"));

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Adding…");
  });

  it("closes dialog and resets state on successful mutation", () => {
    mockUsers = USERS;
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByTestId("command-item-user-aaa-111"));
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    act(() => {
      mockMutate.mock.calls[0][1].onSuccess();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
