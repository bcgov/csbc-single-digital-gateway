import { createFileRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";

const mockUseQuery = jest.fn();
let mockEnsureQueryData: jest.Mock;
let mockRouteUseParams: jest.Mock;

const mockRemoveMutate = jest.fn();

jest.mock("@tanstack/react-router", () => {
  const _mockRouteUseParams = jest.fn();
  const _mockNavigate = jest.fn();
  return {
    __mockRouteUseParams: _mockRouteUseParams,
    __mockNavigate: _mockNavigate,
    createFileRoute: jest.fn((path: string) => {
      return (config: Record<string, unknown>) => ({
        path,
        options: config,
        useParams: _mockRouteUseParams,
      });
    }),
    useNavigate: () => _mockNavigate,
  };
});

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock("src/lib/react-query.client", () => {
  const _mockEnsureQueryData = jest.fn();
  return {
    __mockEnsureQueryData: _mockEnsureQueryData,
    queryClient: { ensureQueryData: _mockEnsureQueryData },
  };
});

jest.mock("@repo/ui", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Separator: () => <hr />,
}));

jest.mock("@tabler/icons-react", () => ({
  IconPlus: () => <span data-testid="icon-plus" />,
  IconUserPlus: () => <span data-testid="icon-user-plus" />,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock(
  "src/features/admin/org-units/components/children-table.component",
  () => ({
    ChildrenTable: ({ orgUnits }: any) => (
      <div data-testid="children-table" data-count={orgUnits?.length ?? 0} />
    ),
  }),
);
jest.mock(
  "src/features/admin/org-units/components/create-child-org-unit-dialog.component",
  () => ({
    CreateChildOrgUnitDialog: ({ parentId, trigger }: any) => (
      <div data-testid="create-child-dialog" data-parent-id={parentId}>
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/org-units/components/add-member-dialog.component",
  () => ({
    AddMemberDialog: ({ orgUnitId, trigger }: any) => (
      <div data-testid="add-member-dialog" data-org-unit-id={orgUnitId}>
        {trigger}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/org-units/components/member-table.component",
  () => ({
    MemberTable: ({ members, onRemove }: any) => (
      <div data-testid="member-table" data-count={members?.length ?? 0}>
        {members?.map((m: any) => (
          <button key={m.userId} onClick={() => onRemove(m)}>
            Remove-{m.userId}
          </button>
        ))}
      </div>
    ),
  }),
);
jest.mock(
  "src/features/admin/org-units/components/remove-member-dialog.component",
  () => ({
    RemoveMemberDialog: ({ member, onConfirm, onCancel }: any) => (
      <div
        data-testid="remove-member-dialog"
        data-has-member={String(!!member)}
        data-member-id={member?.userId ?? "none"}
      >
        <button onClick={onConfirm}>ConfirmRemove</button>
        <button onClick={onCancel}>CancelRemove</button>
      </div>
    ),
  }),
);
jest.mock("src/features/admin/org-units/data/org-unit-children.query", () => ({
  allowedChildTypesQueryOptions: jest.fn((id: string) => ({
    queryKey: ["org-units", id, "allowed-child-types"],
  })),
  orgUnitChildrenQueryOptions: jest.fn((id: string) => ({
    queryKey: ["org-units", id, "children"],
  })),
}));
jest.mock("src/features/admin/org-units/data/org-unit-members.query", () => ({
  orgUnitMembersQueryOptions: jest.fn((id: string) => ({
    queryKey: ["org-units", id, "members"],
  })),
}));
jest.mock("src/features/admin/org-units/data/org-units.mutations", () => ({
  useRemoveMember: () => ({ mutate: mockRemoveMutate, isPending: false }),
}));
jest.mock("src/features/admin/org-units/data/org-units.query", () => ({
  orgUnitQueryOptions: jest.fn((id: string) => ({ queryKey: ["org-units", id] })),
}));


const { __mockRouteUseParams } = jest.requireMock("@tanstack/react-router") as {
  __mockRouteUseParams: jest.Mock;
};
mockRouteUseParams = __mockRouteUseParams;
const { __mockEnsureQueryData } = jest.requireMock("src/lib/react-query.client") as {
  __mockEnsureQueryData: jest.Mock;
};
mockEnsureQueryData = __mockEnsureQueryData;

import { Route } from "src/app/routes/admin/settings/org-units/$orgUnitId";

type RouteLike = {
  path: string;
  options: {
    component: ComponentType;
    loader: (ctx: { params: Record<string, string> }) => Promise<unknown>;
    staticData: { breadcrumbs: (loaderData: unknown) => unknown[] };
  };
  useParams: jest.Mock;
};
const typedRoute = Route as unknown as RouteLike;

const baseOrgUnit = {
  id: "ou-dept-1",
  name: "Department of Finance",
  type: "ministry",
  createdAt: "2023-01-15T00:00:00Z",
  updatedAt: "2024-06-01T00:00:00Z",
};

describe("Admin Org Unit Detail Route (/admin/settings/org-units/$orgUnitId)", () => {
  beforeEach(() => {
    mockRouteUseParams.mockReturnValue({ orgUnitId: "ou-dept-1" });
    mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe("Route registration", () => {
    it("Should register at /admin/settings/org-units/$orgUnitId", () => {
      expect(createFileRoute as unknown as jest.Mock).toHaveBeenCalledWith(
        "/admin/settings/org-units/$orgUnitId",
      );
    });
  });

  describe("Loader", () => {
    it("Should call ensureQueryData and return orgUnitName", async () => {
      mockEnsureQueryData.mockResolvedValue({ name: "Department of Finance", id: "ou-dept-1" });
      const result = await typedRoute.options.loader({
        params: { orgUnitId: "ou-dept-1" },
      });
      expect(mockEnsureQueryData).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ orgUnitName: "Department of Finance" });
    });
  });

  describe("Breadcrumbs", () => {
    it("Should return three breadcrumb levels with orgUnitName", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs({
        orgUnitName: "Department of Finance",
      });
      expect(crumbs).toEqual([
        { label: "Settings", to: "/admin/settings" },
        { label: "Org Units", to: "/admin/settings/org-units" },
        { label: "Department of Finance" },
      ]);
    });

    it("Should omit name breadcrumb when orgUnitName is missing", () => {
      const crumbs = typedRoute.options.staticData.breadcrumbs(undefined);
      expect(crumbs).toHaveLength(2);
    });
  });

  describe("Loading state", () => {
    it("Should show loading indicator when org unit is loading", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: true, error: null });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Loading…")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("Should show error message when org unit fetch fails", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: "Org unit not found" },
      });
      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Org unit not found")).toBeInTheDocument();
    });
  });

  describe("Null state", () => {
    it("Should render nothing when org unit is null", () => {
      mockUseQuery.mockReturnValue({ data: null, isLoading: false, error: null });
      const { container } = render(<typedRoute.options.component />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Non-team org unit data state", () => {
    beforeEach(() => {
      // orgUnit, members, children, allowedTypes
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: [], isLoading: false, error: null })
        .mockReturnValueOnce({ data: [], isLoading: false, error: null })
        .mockReturnValueOnce({ data: ["division"] });
    });

    it("Should render org unit name as heading", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Department of Finance",
      );
    });

    it("Should render type badge", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("badge")).toHaveTextContent("ministry");
    });

    it("Should render Details, Child Org Units, and Members sections", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Child Org Units")).toBeInTheDocument();
      expect(screen.getByText("Members")).toBeInTheDocument();
    });

    it("Should render Add Member dialog with correct orgUnitId", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("add-member-dialog")).toHaveAttribute(
        "data-org-unit-id",
        "ou-dept-1",
      );
    });

    it("Should render Create Child dialog when allowedTypes is non-empty", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("create-child-dialog")).toHaveAttribute(
        "data-parent-id",
        "ou-dept-1",
      );
    });

    it("Should render children table", () => {
      render(<typedRoute.options.component />);
      expect(screen.getByTestId("children-table")).toBeInTheDocument();
    });
  });

  describe("Team type org unit", () => {
    it("Should hide Child Org Units section for team type", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...baseOrgUnit, type: "team" },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      expect(screen.queryByText("Child Org Units")).not.toBeInTheDocument();
      expect(screen.queryByTestId("children-table")).not.toBeInTheDocument();
      expect(screen.queryByTestId("create-child-dialog")).not.toBeInTheDocument();
    });

    it("Should still render Members section for team type", () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: { ...baseOrgUnit, type: "team" },
          isLoading: false,
          error: null,
        })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Members")).toBeInTheDocument();
    });
  });

  describe("Members data", () => {
    it("Should render member table with correct count", () => {
      const members = [
        { userId: "u1", name: "Alice Smith", email: "alice@gov.bc.ca" },
        { userId: "u2", name: "Bob Jones", email: "bob@gov.bc.ca" },
      ];
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: members, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      const table = screen.getByTestId("member-table");
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute("data-count", "2");
    });

    it("Should show members loading state", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined, isLoading: true, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Loading members…")).toBeInTheDocument();
    });

    it("Should show members error state", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          error: { message: "Members fetch failed" },
        })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Members fetch failed")).toBeInTheDocument();
    });
  });

  describe("Children loading and error states", () => {
    it("Should show children loading state", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined, isLoading: true, error: null })
        .mockReturnValueOnce({ data: ["division"] });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Loading children...")).toBeInTheDocument();
    });

    it("Should show children error state", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: undefined, isLoading: false, error: null })
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          error: { message: "Children fetch failed" },
        })
        .mockReturnValueOnce({ data: ["division"] });

      render(<typedRoute.options.component />);
      expect(screen.getByText("Error: Children fetch failed")).toBeInTheDocument();
    });
  });

  describe("Create Child button visibility", () => {
    it("Should not show Create Child button when allowedTypes is empty", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: [], isLoading: false, error: null })
        .mockReturnValueOnce({ data: [], isLoading: false, error: null })
        .mockReturnValueOnce({ data: [] }); // no allowed types

      render(<typedRoute.options.component />);
      expect(screen.queryByTestId("create-child-dialog")).not.toBeInTheDocument();
    });
  });

  describe("Interaction: handleRemoveConfirm via member table", () => {
    const members = [
      { userId: "u1", name: "Alice Smith", email: "alice@gov.bc.ca" },
    ];

    it("Should show RemoveMemberDialog with member set when Remove button is clicked", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: members, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      expect(screen.getByTestId("remove-member-dialog")).toHaveAttribute("data-has-member", "false");
      fireEvent.click(screen.getByText("Remove-u1"));
      expect(screen.getByTestId("remove-member-dialog")).toHaveAttribute("data-has-member", "true");
      expect(screen.getByTestId("remove-member-dialog")).toHaveAttribute("data-member-id", "u1");
    });

    it("Should call removeMutation.mutate with userId on ConfirmRemove", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: members, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(mockRemoveMutate).toHaveBeenCalledWith("u1", expect.any(Object));
    });

    it("Should show toast.success with member name and clear member on successful removal", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockRemoveMutate.mockImplementation((_: string, { onSuccess }: { onSuccess: () => void }) => {
        onSuccess();
      });
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: members, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.success).toHaveBeenCalledWith("Removed Alice Smith");
      expect(screen.getByTestId("remove-member-dialog")).toHaveAttribute("data-has-member", "false");
    });

    it("Should show toast.error when removal fails", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockRemoveMutate.mockImplementation((_: string, { onError }: { onError: (e: Error) => void }) => {
        onError(new Error("Unauthorized"));
      });
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: members, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.error).toHaveBeenCalledWith("Failed to remove member: Unauthorized");
    });

    it("Should clear memberToRemove when CancelRemove is clicked", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: members, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u1"));
      expect(screen.getByTestId("remove-member-dialog")).toHaveAttribute("data-has-member", "true");
      fireEvent.click(screen.getByText("CancelRemove"));
      expect(screen.getByTestId("remove-member-dialog")).toHaveAttribute("data-has-member", "false");
    });

    it("Should not call removeMutation.mutate when ConfirmRemove is clicked with no member set", () => {
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(mockRemoveMutate).not.toHaveBeenCalled();
    });

    it("Should use email as fallback in toast when member has no name", () => {
      const { toast } = jest.requireMock("sonner") as { toast: { success: jest.Mock; error: jest.Mock } };
      mockRemoveMutate.mockImplementation((_: string, { onSuccess }: { onSuccess: () => void }) => {
        onSuccess();
      });
      const membersNoName = [{ userId: "u2", name: null, email: "bob@gov.bc.ca" }];
      mockUseQuery
        .mockReturnValueOnce({ data: baseOrgUnit, isLoading: false, error: null })
        .mockReturnValueOnce({ data: membersNoName, isLoading: false, error: null })
        .mockReturnValue({ data: [] });

      render(<typedRoute.options.component />);
      fireEvent.click(screen.getByText("Remove-u2"));
      fireEvent.click(screen.getByText("ConfirmRemove"));
      expect(toast.success).toHaveBeenCalledWith("Removed bob@gov.bc.ca");
    });
  });
});
