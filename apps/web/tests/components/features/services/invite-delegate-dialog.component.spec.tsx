import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { toast } from "sonner";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
  },
}));

jest.mock("@tabler/icons-react", () => ({
  IconUserPlus: ({ className }: { className?: string }) => (
    <svg data-testid="icon-user-plus" className={className} />
  ),
}));

jest.mock("@repo/ui", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  const DialogContext: React.Context<{
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }> = React.createContext({
    open: false,
  });

  const RadioGroupContext: React.Context<{
    value?: string;
    onValueChange?: (value: string) => void;
  }> = React.createContext({});

  return {
    Button: ({
      children,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) => (
      <button {...props}>{children}</button>
    ),

    Dialog: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange?: (open: boolean) => void;
      children?: ReactNode;
    }) => (
      <DialogContext.Provider value={{ open, onOpenChange }}>
        <div>{children}</div>
      </DialogContext.Provider>
    ),

    DialogTrigger: ({ children }: { children?: ReactNode }) => {
      const context = React.useContext(DialogContext);

      return (
        <span onClick={() => context.onOpenChange?.(true)}>{children}</span>
      );
    },

    DialogContent: ({
      children,
      className,
    }: {
      children?: ReactNode;
      className?: string;
    }) => {
      const context = React.useContext(DialogContext);

      if (!context.open) {
        return null;
      }

      return (
        <div role="dialog" aria-modal="true" className={className}>
          {children}
        </div>
      );
    },

    DialogHeader: ({ children }: { children?: ReactNode }) => (
      <div>{children}</div>
    ),

    DialogTitle: ({ children }: { children?: ReactNode }) => (
      <h2>{children}</h2>
    ),

    Input: (props: InputHTMLAttributes<HTMLInputElement>) => (
      <input {...props} />
    ),

    Label: ({
      children,
      ...props
    }: LabelHTMLAttributes<HTMLLabelElement> & { children?: ReactNode }) => (
      <label {...props}>{children}</label>
    ),

    RadioGroup: ({
      children,
      value,
      onValueChange,
      className,
    }: {
      children?: ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
      className?: string;
    }) => (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        <div role="radiogroup" className={className}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    ),

    RadioGroupItem: ({ value, id }: { value: string; id: string }) => {
      const context = React.useContext(RadioGroupContext);

      return (
        <input
          id={id}
          type="radio"
          name="invite-method"
          value={value}
          checked={context.value === value}
          onChange={() => context.onValueChange?.(value)}
        />
      );
    },

    Select: ({
      children,
    }: {
      children?: ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => <div>{children}</div>,

    SelectTrigger: ({
      children,
      className,
    }: {
      children?: ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,

    SelectValue: ({ children }: { children?: ReactNode }) => (
      <span>{children}</span>
    ),

    SelectContent: ({ children }: { children?: ReactNode }) => (
      <div>{children}</div>
    ),

    SelectItem: ({
      children,
      value,
    }: {
      children?: ReactNode;
      value: string;
    }) => <div data-value={value}>{children}</div>,

    Textarea: (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
      <textarea {...props} />
    ),
  };
});

import { InviteDelegateDialog } from "src/features/services/components/invite-delegate-dialog.component";

const mockToastSuccess = toast.success as jest.Mock;

describe("InviteDelegateDialog Component Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const openDialog = () => {
    fireEvent.click(screen.getByRole("button", { name: /invite delegate/i }));
  };

  const clickDialogSubmit = () => {
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /invite delegate/i }),
    );
  };

  it("Should render the default trigger and open the dialog with default content", () => {
    render(<InviteDelegateDialog />);

    expect(
      screen.getByRole("button", { name: /invite delegate/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("icon-user-plus")).toBeInTheDocument();

    openDialog();

    expect(
      screen.getByRole("heading", { name: "Invite a delegate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A delegate is someone you trust to help complete/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Text Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute(
      "placeholder",
      "name@example.com",
    );
    expect(screen.getByLabelText("Message (optional)")).toBeInTheDocument();

    const monthOptions = screen.getAllByText("1 month");
    expect(monthOptions).toHaveLength(2);

    expect(
      screen.getByText(/How long your delegate can access the service/i),
    ).toBeInTheDocument();
  });

  it("Should render and use a custom trigger", () => {
    render(
      <InviteDelegateDialog
        trigger={<button type="button">Open custom invite</button>}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /open custom invite/i }),
    );

    expect(
      screen.getByRole("heading", { name: "Invite a delegate" }),
    ).toBeInTheDocument();
  });

  it("Should show required validation errors for an empty submission", () => {
    render(<InviteDelegateDialog />);

    openDialog();
    clickDialogSubmit();

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("Should switch from email to text invitation and clear contact errors and value", async () => {
    render(<InviteDelegateDialog />);

    openDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Alex Smith" },
    });

    const emailInput = screen.getByLabelText("Email address");

    fireEvent.change(emailInput, {
      target: { value: "not-an-email" },
    });

    expect(emailInput).toHaveValue("not-an-email");

    clickDialogSubmit();

    fireEvent.click(screen.getByLabelText("Text Message"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    });

    const contactInput = screen.getByLabelText("Phone number");

    expect(contactInput).toHaveAttribute("type", "tel");
    expect(contactInput).toHaveAttribute("placeholder", "+1 (555) 123-4567");
    expect(contactInput).toHaveValue("");
    expect(screen.getByLabelText("Name")).toHaveValue("Alex Smith");
  });

  it("Should validate phone numbers for text invitations", () => {
    render(<InviteDelegateDialog />);

    openDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Jordan Lee" },
    });
    fireEvent.click(screen.getByLabelText("Text Message"));
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "123" },
    });
    clickDialogSubmit();

    expect(
      screen.getByText("Please enter a valid phone number"),
    ).toBeInTheDocument();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it("Should submit successfully, close the dialog, and reset the form", () => {
    render(<InviteDelegateDialog />);

    openDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Taylor Brown" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "taylor@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message (optional)"), {
      target: { value: "Please help me finish this form." },
    });

    clickDialogSubmit();

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Invitation sent to Taylor Brown",
    );
    expect(
      screen.queryByRole("heading", { name: "Invite a delegate" }),
    ).not.toBeInTheDocument();

    openDialog();

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toBeChecked();
    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(screen.getByLabelText("Message (optional)")).toHaveValue("");
  });
});
