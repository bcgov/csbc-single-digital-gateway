import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Contributor } from "src/features/admin/services/data/services.query";

jest.mock("@repo/ui", () => ({
  AlertDialog: ({ open, children, onOpenChange }: any) =>
    open ? (
      <div data-testid="alert-dialog">
        {children}
        <button data-testid="close-trigger" onClick={() => onOpenChange?.(false)}>CloseDialog</button>
      </div>
    ) : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, disabled, ...props }: any) => (
    <button type="button" disabled={disabled} {...props}>
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, disabled, onClick, ...props }: any) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

import { RemoveServiceContributorDialog } from "src/features/admin/services/components/remove-service-contributor-dialog.component";

const CONTRIBUTOR_WITH_NAME: Contributor = {
  userId: "aaaa-1111-aaaa-1111",
  name: "Jane Doe",
  email: "jane.doe@gov.bc.ca",
  role: "owner",
  createdAt: "2025-01-10T00:00:00Z",
};

const CONTRIBUTOR_EMAIL_ONLY: Contributor = {
  userId: "bbbb-2222-bbbb-2222",
  name: null,
  email: "nameless@gov.bc.ca",
  role: "owner",
  createdAt: "2025-02-15T00:00:00Z",
};

const CONTRIBUTOR_NO_IDENTITY: Contributor = {
  userId: "cccc-3333-cccc-3333",
  name: null,
  email: null,
  role: "owner",
  createdAt: "2025-03-20T00:00:00Z",
};

describe("RemoveServiceContributorDialog", () => {
  afterEach(cleanup);

  it("does not render when contributor is null", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={null}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when contributor is provided", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_WITH_NAME}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
    expect(screen.getByText("Remove Contributor")).toBeInTheDocument();
  });

  it("displays contributor name in the confirmation message", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_WITH_NAME}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText(/from this service/)).toBeInTheDocument();
  });

  it("falls back to email when contributor name is null", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_EMAIL_ONLY}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText(/nameless@gov\.bc\.ca/)).toBeInTheDocument();
  });

  it("falls back to 'this contributor' when name and email are both null", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_NO_IDENTITY}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByText(/this contributor/)).toBeInTheDocument();
  });

  it("calls onConfirm when the Remove button is clicked", () => {
    const onConfirm = jest.fn();
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_WITH_NAME}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons and shows Removing text when isPending", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_WITH_NAME}
        isPending={true}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("calls onCancel when dialog is closed via onOpenChange(false)", () => {
    const onCancel = jest.fn();
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_WITH_NAME}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId("close-trigger"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders Cancel button when not pending", () => {
    render(
      <RemoveServiceContributorDialog
        contributor={CONTRIBUTOR_WITH_NAME}
        isPending={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).not.toBeDisabled();
  });
});
