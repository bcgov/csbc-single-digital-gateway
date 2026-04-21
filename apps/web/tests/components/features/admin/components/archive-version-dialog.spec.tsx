import { cleanup, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@repo/ui", () => ({
  AlertDialog: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" disabled={disabled} {...props}>{children}</button>
  ),
  AlertDialogAction: ({ children, disabled, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>{children}</button>
  ),
}));

import { ArchiveVersionDialog } from "src/features/admin/components/archive-version-dialog.component";

describe("ArchiveVersionDialog", () => {
  afterEach(cleanup);
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  it("Should not render when open is false", () => {
    render(<ArchiveVersionDialog open={false} isPending={false} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
  });

  it("Should render title and description when open", () => {
    render(<ArchiveVersionDialog open={true} isPending={false} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText("Archive Version")).toBeInTheDocument();
    expect(screen.getByText(/no longer be available/)).toBeInTheDocument();
  });

  it("Should call onConfirm when Archive is clicked", () => {
    render(<ArchiveVersionDialog open={true} isPending={false} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Should show Archiving text when isPending", () => {
    render(<ArchiveVersionDialog open={true} isPending={true} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole("button", { name: "Archiving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
