import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockMutate = jest.fn();
let mockIsPending = false;

jest.mock("src/features/admin/service-types/data/service-types.mutations", () => ({
  useCreateServiceType: () => ({
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

jest.mock("@jsonforms/react", () => ({
  JsonForms: ({ onChange }: any) => (
    <div data-testid="json-forms">
      <input
        data-testid="json-forms-name"
        placeholder="Name (JsonForms)"
        onChange={(e: any) => onChange({ data: { name: e.target.value } })}
      />
    </div>
  ),
}));

jest.mock("@jsonforms/core", () => ({}));

jest.mock("@repo/jsonforms", () => ({
  repoAjv: {},
  repoCells: [],
  repoRenderers: [],
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

import { CreateServiceTypeDialog } from "src/features/admin/service-types/components/create-service-type-dialog.component";

describe("CreateServiceTypeDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  afterEach(cleanup);

  const renderDialog = (onCreated?: jest.Mock) =>
    render(
      <CreateServiceTypeDialog
        trigger={<button type="button">Open Create Dialog</button>}
        onCreated={onCreated}
      />,
    );

  const openDialog = () =>
    fireEvent.click(screen.getByRole("button", { name: "Open Create Dialog" }));

  it("does not show dialog content before trigger is clicked", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the dialog heading and JsonForms stub when opened", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Service Type" })).toBeInTheDocument();
    expect(screen.getByTestId("json-forms")).toBeInTheDocument();
  });

  it("shows the descriptive helper text inside the dialog", () => {
    renderDialog();
    openDialog();

    expect(
      screen.getByText(/This will create a new service type/),
    ).toBeInTheDocument();
  });

  it("renders the Create Service Type submit button as enabled", () => {
    renderDialog();
    openDialog();

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveTextContent("Create Service Type");
    expect(submitBtn).not.toBeDisabled();
  });

  it("does not call mutate when formData is empty on submit", () => {
    renderDialog();
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not call mutate when only name is provided but description is missing", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByTestId("json-forms-name"), {
      target: { value: "Health Services" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("disables the submit button and shows Creating text when isPending", () => {
    mockIsPending = true;
    renderDialog();
    openDialog();

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent("Creating…");
  });

  it("dialog stays open while no valid mutation has fired", () => {
    renderDialog();
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
