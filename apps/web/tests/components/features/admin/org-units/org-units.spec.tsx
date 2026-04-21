import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

jest.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
    className?: string;
  }) => {
    const href = params
      ? Object.entries(params).reduce(
          (path, [key, value]) => path.replace(`$${key}`, value),
          to,
        )
      : to;
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
}));

jest.mock("@tabler/icons-react", () => ({
  IconTrash: ({ className }: { className?: string }) => (
    <svg data-testid="icon-trash" className={className} />
  ),
}));

let mockOnOpenChange: ((open: boolean) => void) | undefined;

jest.mock("@repo/ui", () => ({
  Table: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <table {...props}>{children}</table>
  ),
  TableHeader: ({ children }: { children?: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
  TableHead: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableCell: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  Badge: ({
    children,
    variant,
    className,
  }: {
    children?: ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
  Button: ({
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
  AlertDialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: ReactNode;
  }) => {
    mockOnOpenChange = onOpenChange;
    return open ? <div>{children}</div> : null;
  },
  AlertDialogContent: ({ children }: { children?: ReactNode }) => (
    <div role="alertdialog">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-slot="alert-dialog-action"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children?: ReactNode;
    disabled?: boolean;
  }) => (
    <button
      data-slot="alert-dialog-cancel"
      disabled={disabled}
      onClick={() => mockOnOpenChange?.(false)}
    >
      {children}
    </button>
  ),
  Pagination: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <nav className={className}>{children}</nav>
  ),
  PaginationContent: ({ children }: { children?: ReactNode }) => <ul>{children}</ul>,
  PaginationItem: ({ children }: { children?: ReactNode }) => <li>{children}</li>,
  PaginationLink: ({
    children,
    isActive,
    onClick,
    className,
  }: {
    children?: ReactNode;
    isActive?: boolean;
    onClick?: () => void;
    className?: string;
  }) => (
    <a
      href="#"
      aria-current={isActive ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className={className}
    >
      {children}
    </a>
  ),
  PaginationPrevious: ({
    onClick,
    className,
    ...props
  }: {
    onClick?: () => void;
    className?: string;
  } & Record<string, unknown>) => (
    <a
      href="#"
      aria-disabled={props["aria-disabled"] as boolean | undefined}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className={className}
    >
      Previous
    </a>
  ),
  PaginationNext: ({
    onClick,
    className,
    ...props
  }: {
    onClick?: () => void;
    className?: string;
  } & Record<string, unknown>) => (
    <a
      href="#"
      aria-disabled={props["aria-disabled"] as boolean | undefined}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
      className={className}
    >
      Next
    </a>
  ),
}));

import type { Member } from "../../../../../src/features/admin/org-units/data/org-unit-members.query";
import type { OrgUnit } from "../../../../../src/features/admin/org-units/data/org-units.query";
import { MemberTable } from "../../../../../src/features/admin/org-units/components/member-table.component";
import { OrgUnitsTable } from "../../../../../src/features/admin/org-units/components/org-units-table.component";
import { ChildrenTable } from "../../../../../src/features/admin/org-units/components/children-table.component";
import { RemoveMemberDialog } from "../../../../../src/features/admin/org-units/components/remove-member-dialog.component";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_UNIT_FIXTURES: OrgUnit[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Ministry of Health",
    type: "ministry",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Digital Services Branch",
    type: "branch",
    createdAt: "2025-03-10T00:00:00Z",
    updatedAt: "2025-05-20T00:00:00Z",
  },
];

const MEMBER_FIXTURES: Member[] = [
  {
    userId: "aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Alice Smith",
    email: "alice@example.com",
    role: "admin",
    createdAt: "2025-02-01T00:00:00Z",
  },
  {
    userId: "bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    name: null,
    email: "bob@example.com",
    role: "member",
    createdAt: "2025-04-15T00:00:00Z",
  },
  {
    userId: "cccc3333-cccc-cccc-cccc-cccccccccccc",
    name: null,
    email: null,
    role: "member",
    createdAt: "2025-05-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// MemberTable
// ---------------------------------------------------------------------------

describe("MemberTable", () => {
  afterEach(cleanup);

  it("renders member rows with name, email, and role", () => {
    const onRemove = jest.fn();
    render(<MemberTable members={MEMBER_FIXTURES} onRemove={onRemove} />);

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    expect(rows).toHaveLength(3);

    const firstRowCells = within(rows[0]).getAllByRole("cell");
    expect(firstRowCells[0]).toHaveTextContent("Alice Smith");
    expect(firstRowCells[1]).toHaveTextContent("alice@example.com");
    expect(firstRowCells[2]).toHaveTextContent("admin");

    const secondRowCells = within(rows[1]).getAllByRole("cell");
    expect(secondRowCells[0]).toHaveTextContent("—");
    expect(secondRowCells[1]).toHaveTextContent("bob@example.com");
    expect(secondRowCells[2]).toHaveTextContent("member");
  });

  it("shows empty state when no members", () => {
    const onRemove = jest.fn();
    render(<MemberTable members={[]} onRemove={onRemove} />);

    expect(screen.getByText(/No members yet/)).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("calls onRemove with the correct member when remove button clicked", () => {
    const onRemove = jest.fn();
    render(<MemberTable members={MEMBER_FIXTURES} onRemove={onRemove} />);

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    const button = within(rows[1]).getByRole("button");
    fireEvent.click(button);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(MEMBER_FIXTURES[1]);
  });
});

// ---------------------------------------------------------------------------
// RemoveMemberDialog
// ---------------------------------------------------------------------------

describe("RemoveMemberDialog", () => {
  const MEMBER: Member = MEMBER_FIXTURES[0];

  afterEach(cleanup);

  it("shows member name in the confirmation dialog", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Remove Member")).toBeVisible();
    expect(screen.getByText(/Alice Smith/)).toBeVisible();
  });

  it("falls back to email when name is null", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={MEMBER_FIXTURES[1]}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText(/bob@example.com/)).toBeVisible();
  });

  it("falls back to 'this member' when name and email are null", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={MEMBER_FIXTURES[2]}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText(/this member/)).toBeVisible();
  });

  it("calls onConfirm when the Remove button is clicked", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const actionButton = screen.getByText("Remove");
    fireEvent.click(actionButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when the Cancel button is clicked", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables buttons when isPending is true", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={MEMBER}
        isPending={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Cancel")).toBeDisabled();
    expect(screen.getByText("Removing…")).toBeDisabled();
  });

  it("does not render when member is null", () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <RemoveMemberDialog
        member={null}
        isPending={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByText("Remove Member")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OrgUnitsTable
// ---------------------------------------------------------------------------

describe("OrgUnitsTable", () => {
  afterEach(cleanup);

  it("renders rows from org units data", () => {
    const onPageChange = jest.fn();
    render(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Ministry of Health");
    expect(rows[0]).toHaveTextContent("ministry");
    expect(rows[1]).toHaveTextContent("Digital Services Branch");
    expect(rows[1]).toHaveTextContent("branch");
  });

  it("shows empty state when no org units on page 1", () => {
    const onPageChange = jest.fn();
    render(
      <OrgUnitsTable
        orgUnits={[]}
        currentPage={1}
        totalPages={0}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/No org units found/)).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders links to the detail page for each org unit", () => {
    const onPageChange = jest.fn();
    render(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    const link = within(rows[0]).getByRole("link");
    expect(link).toHaveAttribute("href");
    expect(link.getAttribute("href")).toContain(ORG_UNIT_FIXTURES[0].id);
  });

  it("does not render pagination when totalPages is 1", () => {
    const onPageChange = jest.fn();
    render(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("renders pagination and calls onPageChange", () => {
    const onPageChange = jest.fn();
    render(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    fireEvent.click(screen.getByText("2"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables previous button on first page", () => {
    const onPageChange = jest.fn();
    render(
      <OrgUnitsTable
        orgUnits={ORG_UNIT_FIXTURES}
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    const nav = screen.getByRole("navigation");
    const prevLink = within(nav).getByText("Previous");
    expect(prevLink).toHaveAttribute("aria-disabled", "true");
    expect(prevLink).toHaveClass("pointer-events-none");
  });
});

// ---------------------------------------------------------------------------
// ChildrenTable
// ---------------------------------------------------------------------------

describe("ChildrenTable", () => {
  afterEach(cleanup);

  it("renders child org unit rows", () => {
    render(<ChildrenTable orgUnits={ORG_UNIT_FIXTURES} />);

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Ministry of Health");
    expect(rows[1]).toHaveTextContent("Digital Services Branch");
  });

  it("shows empty state when no children", () => {
    render(<ChildrenTable orgUnits={[]} />);

    expect(screen.getByText(/No child org units yet/)).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders links to detail pages", () => {
    render(<ChildrenTable orgUnits={ORG_UNIT_FIXTURES} />);

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    const link = within(rows[0]).getByRole("link");
    expect(link).toHaveAttribute("href");
    expect(link.getAttribute("href")).toContain(ORG_UNIT_FIXTURES[0].id);
  });

  it("displays type as a badge", () => {
    render(<ChildrenTable orgUnits={ORG_UNIT_FIXTURES} />);

    const rows = screen.getAllByRole("row").filter((r) => r.closest("tbody"));
    expect(within(rows[0]).getByText("ministry")).toBeVisible();
    expect(within(rows[1]).getByText("branch")).toBeVisible();
  });
});
