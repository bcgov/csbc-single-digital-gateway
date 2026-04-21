import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockMutate = jest.fn();
let mockIsPending = false;

jest.mock(
  "src/features/admin/consent-documents/data/consent-documents.mutations",
  () => ({
    useCreateConsentDocument: () => ({
      mutate: mockMutate,
      get isPending() {
        return mockIsPending;
      },
    }),
  }),
);

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

jest.mock(
  "src/features/admin/consent-document-types/data/consent-document-types.query",
  () => ({
    documentTypeQueryOptions: (typeId: string) => ({
      queryKey: ["document-type", typeId],
      queryFn: () => null,
    }),
  }),
);

jest.mock("src/features/admin/consent-documents/data/async-select-loaders", () => ({
  loadOrgUnits: jest.fn(),
  loadDocumentTypes: jest.fn(),
  resolveOrgUnit: jest.fn(),
  resolveDocumentType: jest.fn(),
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
        data-testid="json-forms-org-unit"
        placeholder="OrgUnit"
        onChange={(e: any) =>
          onChange({
            data: { orgUnitId: e.target.value, consentDocumentTypeId: "" },
          })
        }
      />
    </div>
  ),
}));

jest.mock("@jsonforms/core", () => ({}));

jest.mock("@repo/jsonforms", () => ({
  repoAjv: {},
  repoCells: [],
  repoRenderers: [],
  applySchemaDefaults: (_schema: unknown, data: unknown) => data,
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
    Textarea: (props: any) => <textarea {...props} />,
  };
});

import { CreateDocumentDialog } from "src/features/admin/consent-documents/components/create-document-dialog.component";

describe("CreateDocumentDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  afterEach(cleanup);

  const renderDialog = (onCreated?: jest.Mock) =>
    render(
      <CreateDocumentDialog
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

  it("shows dialog heading, Name input, Description textarea, and JsonForms when opened", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create Consent Document" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByTestId("json-forms")).toBeInTheDocument();
  });

  it("renders the Create Document submit button as enabled initially", () => {
    renderDialog();
    openDialog();

    const submitBtn = screen.getByRole("dialog").querySelector("button[type='submit']")!;
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveTextContent("Create Document");
    expect(submitBtn).not.toBeDisabled();
  });

  it("does not call mutate when all required fields are missing on submit", () => {
    renderDialog();
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not call mutate when name is empty even if orgUnitId is provided", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByTestId("json-forms-org-unit"), {
      target: { value: "org-unit-abc" },
    });

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not call mutate when name is provided but orgUnitId and typeId are missing", () => {
    renderDialog();
    openDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "FOIPPA Privacy Consent" },
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

  it("Name field accepts and retains typed input", () => {
    renderDialog();
    openDialog();

    const nameInput = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "FOIPPA Privacy Consent" } });

    expect(nameInput.value).toBe("FOIPPA Privacy Consent");
  });

  it("Description field accepts and retains typed input", () => {
    renderDialog();
    openDialog();

    const descInput = screen.getByLabelText("Description") as HTMLTextAreaElement;
    fireEvent.change(descInput, {
      target: { value: "Consent form required under FOIPPA section 33" },
    });

    expect(descInput.value).toBe("Consent form required under FOIPPA section 33");
  });

  it("does not show loading type schema message when no typeId is selected", () => {
    renderDialog();
    openDialog();

    expect(screen.queryByText("Loading type schema…")).not.toBeInTheDocument();
  });

  it("does not show no-published-version warning when no typeId is selected", () => {
    renderDialog();
    openDialog();

    expect(
      screen.queryByText(/This document type has no published version/),
    ).not.toBeInTheDocument();
  });

  it("does not call onCreated when submit is blocked by validation", () => {
    const onCreated = jest.fn();
    renderDialog(onCreated);
    openDialog();

    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    expect(onCreated).not.toHaveBeenCalled();
  });
});
