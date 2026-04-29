import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock(
  "src/features/admin/consent-documents/components/doc-translation-form.component",
  () => ({
    DocTranslationForm: ({ locale }: any) => (
      <div data-testid="translation-form" data-locale={locale} />
    ),
  }),
);

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

import { AddDocTranslationDialog } from "src/features/admin/consent-documents/components/add-doc-translation-dialog.component";

describe("AddDocTranslationDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  const renderDialog = (existingLocales: string[] = []) =>
    render(
      <AddDocTranslationDialog
        docId="doc-111"
        versionId="ver-222"
        existingLocales={existingLocales}
        trigger={<button type="button">Open Translation Dialog</button>}
      />,
    );

  const openDialog = () =>
    fireEvent.click(screen.getByRole("button", { name: "Open Translation Dialog" }));

  it("does not render dialog content before trigger is clicked", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows dialog heading and locale input step when dialog is opened", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Translation" })).toBeInTheDocument();
    expect(screen.getByText("Locale code (e.g. en, fr)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("en")).toBeInTheDocument();
  });

  it("Continue button is disabled when locale input is empty", () => {
    renderDialog();
    openDialog();

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("Continue button is disabled when locale already exists and shows error message", () => {
    renderDialog(["en", "fr"]);
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("en"), {
      target: { value: "fr" },
    });

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText("Translation for this locale already exists.")).toBeInTheDocument();
  });

  it("Continue button is enabled for a new locale not in existingLocales", () => {
    renderDialog(["en"]);
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("en"), {
      target: { value: "es" },
    });

    expect(screen.getByRole("button", { name: "Continue" })).not.toBeDisabled();
  });

  it("shows the doc translation form stub after clicking Continue with a valid locale", () => {
    renderDialog([]);
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("en"), {
      target: { value: "zh" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByTestId("translation-form")).toBeInTheDocument();
    expect(screen.getByTestId("translation-form")).toHaveAttribute("data-locale", "zh");
    expect(screen.queryByPlaceholderText("en")).not.toBeInTheDocument();
  });

  it("does not advance to the form when Continue is clicked with an empty locale", () => {
    renderDialog();
    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.queryByTestId("translation-form")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("en")).toBeInTheDocument();
  });

  it("trims whitespace from locale before advancing to translation form", () => {
    renderDialog([]);
    openDialog();

    fireEvent.change(screen.getByPlaceholderText("en"), {
      target: { value: "  ja  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByTestId("translation-form")).toHaveAttribute("data-locale", "ja");
  });
});
