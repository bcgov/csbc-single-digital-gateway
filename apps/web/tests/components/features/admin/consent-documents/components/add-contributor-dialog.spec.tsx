import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockMutate = jest.fn();
let mockIsPending = false;

jest.mock("src/features/admin/consent-documents/data/consent-documents.mutations", () => ({
  useAddContributor: () => ({
    mutate: mockMutate,
    get isPending() {
      return mockIsPending;
    },
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
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
    Button: ({ children, onClick, disabled, type, ...props }: any) => (
      <button type={type ?? "button"} onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    Input: (props: any) => <input {...props} />,
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  };
});

import { AddContributorDialog } from "src/features/admin/consent-documents/components/add-contributor-dialog.component";

describe("AddContributorDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  afterEach(cleanup);

  const renderDialog = () =>
    render(
      <AddContributorDialog
        docId="doc-abc-123"
        trigger={<button type="button">Open Dialog</button>}
      />,
    );

  const openDialog = () =>
    fireEvent.click(screen.getByRole("button", { name: "Open Dialog" }));

  it("does not show dialog content before the trigger is clicked", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows dialog heading and User ID input after trigger click", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Contributor" })).toBeInTheDocument();
    expect(screen.getByText("User ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter user ID")).toBeInTheDocument();
  });

  it("does not call mutate when user ID field is empty on submit", () => {
    renderDialog();
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not call mutate when user ID is only whitespace", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("Enter user ID"), {
      target: { value: "   " },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutate with trimmed userId and role 'owner' on valid submit", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("Enter user ID"), {
      target: { value: "  user-doc-456  " },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { userId: "user-doc-456", role: "owner" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("shows 'Adding…' text and disables submit button when isPending", () => {
    mockIsPending = true;
    renderDialog();
    openDialog();

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Adding…");
  });

  it("closes the dialog on successful mutation", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("Enter user ID"), {
      target: { value: "user-xyz-789" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    act(() => {
      mockMutate.mock.calls[0][1].onSuccess();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
