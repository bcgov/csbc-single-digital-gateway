import { Badge, Button, Separator } from "@repo/ui";
import { IconPlus, IconUserPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChildrenTable } from "../../../../../features/admin/org-units/components/children-table.component";
import { CreateChildOrgUnitDialog } from "../../../../../features/admin/org-units/components/create-child-org-unit-dialog.component";
import { AddMemberDialog } from "../../../../../features/admin/org-units/components/add-member-dialog.component";
import { MemberTable } from "../../../../../features/admin/org-units/components/member-table.component";
import { RemoveMemberDialog } from "../../../../../features/admin/org-units/components/remove-member-dialog.component";
import {
  allowedChildTypesQueryOptions,
  orgUnitChildrenQueryOptions,
} from "../../../../../features/admin/org-units/data/org-unit-children.query";
import { orgUnitMembersQueryOptions } from "../../../../../features/admin/org-units/data/org-unit-members.query";
import type { Member } from "../../../../../features/admin/org-units/data/org-unit-members.query";
import { useRemoveMember } from "../../../../../features/admin/org-units/data/org-units.mutations";
import { orgUnitQueryOptions } from "../../../../../features/admin/org-units/data/org-units.query";
import { queryClient } from "../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/settings/org-units/$orgUnitId",
)({
  loader: async ({ params }) => {
    const orgUnit = await queryClient.ensureQueryData(
      orgUnitQueryOptions(params.orgUnitId),
    );
    return { orgUnitName: orgUnit.name };
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => {
      const data = loaderData as { orgUnitName: string } | undefined;
      return [
        { label: "Settings", to: "/admin/settings" },
        { label: "Org Units", to: "/admin/settings/org-units" },
        ...(data?.orgUnitName ? [{ label: data.orgUnitName }] : []),
      ];
    },
  },
  component: OrgUnitDetailPage,
});

function OrgUnitDetailPage() {
  const { orgUnitId } = Route.useParams();
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const {
    data: orgUnit,
    isLoading: isLoadingUnit,
    error: unitError,
  } = useQuery(orgUnitQueryOptions(orgUnitId));

  const {
    data: members,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery(orgUnitMembersQueryOptions(orgUnitId));

  const {
    data: children,
    isLoading: isLoadingChildren,
    error: childrenError,
  } = useQuery(orgUnitChildrenQueryOptions(orgUnitId));

  const { data: allowedTypes } = useQuery(
    allowedChildTypesQueryOptions(orgUnitId),
  );

  const removeMutation = useRemoveMember(orgUnitId);

  const handleRemoveConfirm = () => {
    if (!memberToRemove) return;

    removeMutation.mutate(memberToRemove.userId, {
      onSuccess: () => {
        toast.success(
          `Removed ${memberToRemove.name ?? memberToRemove.email ?? "member"}`,
        );
        setMemberToRemove(null);
      },
      onError: (err) => {
        toast.error(`Failed to remove member: ${err.message}`);
      },
    });
  };

  if (isLoadingUnit) return <p className="py-8 text-center">Loading…</p>;
  if (unitError)
    return (
      <p className="py-8 text-center text-destructive">
        Error: {unitError.message}
      </p>
    );
  if (!orgUnit) return null;

  const formattedCreated = new Date(orgUnit.createdAt).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedUpdated = new Date(orgUnit.updatedAt).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const canCreateChildren = allowedTypes && allowedTypes.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>{orgUnit.name}</h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {orgUnit.type}
          </Badge>
        </div>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Details</h2>
        <div className="flex flex-col gap-px border bg-border">
          <div className="grid grid-cols-2 gap-px">
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">Created</p>
              <p className="font-medium">{formattedCreated}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Last Updated
              </p>
              <p className="font-medium">{formattedUpdated}</p>
            </div>
          </div>
        </div>
      </div>

      {orgUnit.type !== "team" && (
        <>
          <Separator />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Child Org Units</h2>
              {canCreateChildren && (
                <CreateChildOrgUnitDialog
                  parentId={orgUnitId}
                  allowedTypes={allowedTypes}
                  trigger={
                    <Button variant="outline">
                      <IconPlus className="size-4" />
                      Create Child
                    </Button>
                  }
                />
              )}
            </div>

            {isLoadingChildren && (
              <p className="text-center">Loading children...</p>
            )}
            {childrenError && (
              <p className="text-center text-destructive">
                Error: {childrenError.message}
              </p>
            )}
            {children && <ChildrenTable orgUnits={children} />}
          </div>
        </>
      )}

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Members</h2>
          <AddMemberDialog
            orgUnitId={orgUnitId}
            trigger={
              <Button variant="outline">
                <IconUserPlus className="size-4" />
                Add Member
              </Button>
            }
          />
        </div>

        {isLoadingMembers && <p className="text-center">Loading members…</p>}
        {membersError && (
          <p className="text-center text-destructive">
            Error: {membersError.message}
          </p>
        )}
        {members && (
          <MemberTable
            members={members}
            onRemove={(member) => setMemberToRemove(member)}
          />
        )}
      </div>

      <RemoveMemberDialog
        member={memberToRemove}
        isPending={removeMutation.isPending}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
