import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CreateServiceDialog } from "../../../../features/admin/services/components/create-service-dialog.component";
import { DeleteServiceDialog } from "../../../../features/admin/services/components/delete-service-dialog.component";
import { ServicesFilterBar } from "../../../../features/admin/services/components/services-filter-bar.component";
import { ServicesTable } from "../../../../features/admin/services/components/services-table.component";
import { useDeleteService } from "../../../../features/admin/services/data/services.mutations";
import { servicesQueryOptions } from "../../../../features/admin/services/data/services.query";

const SearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  orgUnitId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/admin/services/")({
  validateSearch: (search) => SearchSchema.parse(search),
  staticData: {
    breadcrumbs: () => [{ label: "Services" }],
  },
  component: ServicesListPage,
});

function ServicesListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/services" });

  const currentPage = search.page ?? 1;
  const [orgUnitFilter, setOrgUnitFilter] = useState(
    search.orgUnitId ?? "",
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const filters = {
    orgUnitId: search.orgUnitId,
  };

  const { data, isLoading, error } = useQuery(
    servicesQueryOptions(currentPage, 10, filters),
  );

  const updateSearch = useCallback(
    (updates: Record<string, string | undefined>) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          ...updates,
          page: undefined,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const handleOrgUnitChange = (value: string) => {
    setOrgUnitFilter(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateSearch({ orgUnitId: value || undefined });
    }, 400);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const goToPage = (page: number) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: page > 1 ? page : undefined,
      }),
      replace: true,
    });
  };

  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const deleteMutation = useDeleteService();

  const handleCreated = (svc: { id: string }) => {
    void navigate({
      to: "/admin/services/$serviceId",
      params: { serviceId: svc.id },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Services</h1>
          <p className="text-muted-foreground">
            Manage services across org units.
          </p>
        </div>
        <CreateServiceDialog
          onCreated={handleCreated}
          trigger={
            <Button className="bg-bcgov-blue hover:bg-bcgov-blue/80">
              <IconPlus className="size-4" />
              Create Service
            </Button>
          }
        />
      </div>

      <Separator className="bg-bcgov-gold" />

      <ServicesFilterBar
        orgUnitId={orgUnitFilter}
        onOrgUnitIdChange={handleOrgUnitChange}
      />

      {isLoading && <p className="py-8 text-center">Loading…</p>}
      {error && (
        <p className="py-8 text-center text-destructive">
          Error: {error.message}
        </p>
      )}
      {data && (
        <ServicesTable
          services={data.docs}
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          onDelete={setDeletingServiceId}
        />
      )}
      <DeleteServiceDialog
        serviceId={deletingServiceId}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingServiceId) return;
          deleteMutation.mutate(deletingServiceId, {
            onSuccess: () => {
              toast.success("Service deleted.");
              setDeletingServiceId(null);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to delete service.");
            },
          });
        }}
        onCancel={() => setDeletingServiceId(null)}
      />
    </div>
  );
}
