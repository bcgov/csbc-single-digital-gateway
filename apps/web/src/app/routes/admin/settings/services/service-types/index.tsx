import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CreateServiceTypeDialog } from "../../../../../../features/admin/service-types/components/create-service-type-dialog.component";
import { DeleteServiceTypeDialog } from "../../../../../../features/admin/service-types/components/delete-service-type-dialog.component";
import { ServiceTypesTable } from "../../../../../../features/admin/service-types/components/service-types-table.component";
import { useDeleteServiceType } from "../../../../../../features/admin/service-types/data/service-types.mutations";
import { serviceTypesQueryOptions } from "../../../../../../features/admin/service-types/data/service-types.query";

const SearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute(
  "/admin/settings/services/service-types/",
)({
  validateSearch: (search) => SearchSchema.parse(search),
  staticData: {
    breadcrumbs: () => [
      { label: "Settings", to: "/admin/settings" },
      { label: "Service Types" },
    ],
  },
  component: ServiceTypesListPage,
});

function ServiceTypesListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({
    from: "/admin/settings/services/service-types",
  });

  const currentPage = search.page ?? 1;
  const { data, isLoading, error } = useQuery(
    serviceTypesQueryOptions(currentPage),
  );

  const goToPage = (page: number) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: page > 1 ? page : undefined,
      }),
      replace: true,
    });
  };

  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const deleteMutation = useDeleteServiceType();

  const handleCreated = (result: { id: string }) => {
    void navigate({
      to: "/admin/settings/services/service-types/$typeId",
      params: { typeId: result.id },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Service Types</h1>
          <p className="text-muted-foreground">
            Manage service type definitions and their versions.
          </p>
        </div>
        <CreateServiceTypeDialog
          onCreated={handleCreated}
          trigger={
            <Button className="bg-bcgov-blue hover:bg-bcgov-blue/80">
              <IconPlus className="size-4" />
              Create Type
            </Button>
          }
        />
      </div>

      <Separator className="bg-bcgov-gold" />

      {isLoading && <p className="py-8 text-center">Loading…</p>}
      {error && (
        <p className="py-8 text-center text-destructive">
          Error: {error.message}
        </p>
      )}
      {data && (
        <ServiceTypesTable
          types={data.docs}
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          onDelete={setDeletingTypeId}
        />
      )}
      <DeleteServiceTypeDialog
        typeId={deletingTypeId}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingTypeId) return;
          deleteMutation.mutate(deletingTypeId, {
            onSuccess: () => {
              toast.success("Service type deleted.");
              setDeletingTypeId(null);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to delete service type.");
            },
          });
        }}
        onCancel={() => setDeletingTypeId(null)}
      />
    </div>
  );
}
