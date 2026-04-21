import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockMutate = jest.fn();
let mockIsPending = false;

jest.mock("src/features/admin/org-units/data/org-units.mutations", () => ({
  useCreateChildOrgUnit: () => ({
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

  // SelectContext is used to connect Select + SelectItem so options work natively
  const SelectContext = React.createContext({ value: "", onValueChange: null });

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
    Select: ({ children, value, onValueChange }: any) => (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <select
          data-testid="select"
          value={value}
          onChange={(e: any) => onValueChange?.(e.target.value)}
        >
          {children}
        </select>
      </SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  };
});

import { CreateChildOrgUnitDialog } from "src/features/admin/org-units/components/create-child-org-unit-dialog.component";

describe("CreateChildOrgUnitDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  afterEach(cleanup);

  const ALLOWED_TYPES = ["branch", "division", "section"];

  const renderDialog = () =>
    render(
      <CreateChildOrgUnitDialog
        parentId="parent-org-123"
        allowedTypes={ALLOWED_TYPES}
        trigger={<button type="button">Open Create Dialog</button>}
      />,
    );

  const openDialog = () =>
    fireEvent.click(screen.getByRole("button", { name: "Open Create Dialog" }));

  it("does not show dialog content before trigger is clicked", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows dialog heading, Name input, and Type select when opened", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Child Org Unit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("renders all allowed types as select options", () => {
    renderDialog();
    openDialog();

    const select = screen.getByTestId("select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain("branch");
    expect(optionValues).toContain("division");
    expect(optionValues).toContain("section");
  });

  it("shows a validation error and does not call mutate when name is empty", () => {
    renderDialog();
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutate with trimmed name and selected type on valid submit", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "  Digital Services  " },
    });
    fireEvent.change(screen.getByTestId("select"), {
      target: { value: "division" },
    });

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { name: "Digital Services", type: "division" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it("defaults type to the first allowedType", () => {
    renderDialog();
    openDialog();

    const select = screen.getByTestId("select") as HTMLSelectElement;
    expect(select.value).toBe("branch");
  });

  it("disables the submit button and shows Creating text when isPending", () => {
    mockIsPending = true;
    renderDialog();
    openDialog();

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Creating...");
  });

  it("clears name validation error and calls mutate after correcting the name field", () => {
    renderDialog();
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Policy Branch" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("closes dialog and resets form on successful mutation", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Analytics Section" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    act(() => {
      mockMutate.mock.calls[0][1].onSuccess();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
