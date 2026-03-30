import { Button, Separator } from "@repo/ui";
import { IconRefresh } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { OrgUnitsTable } from "../../../../../features/admin/org-units/components/org-units-table.component";
import { useSyncMinistries } from "../../../../../features/admin/org-units/data/org-units.mutations";
import { orgUnitsQueryOptions } from "../../../../../features/admin/org-units/data/org-units.query";

const SearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/admin/settings/org-units/")({
  validateSearch: (search) => SearchSchema.parse(search),
  staticData: {
    breadcrumbs: () => [
      { label: "Settings", to: "/admin/settings" },
      { label: "Org Units" },
    ],
  },
  component: OrgUnitsListPage,
});

function OrgUnitsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/settings/org-units" });

  const currentPage = search.page ?? 1;
  const { data, isLoading, error } = useQuery(
    orgUnitsQueryOptions(currentPage),
  );
  const syncMutation = useSyncMinistries();

  const goToPage = (page: number) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        page: page > 1 ? page : undefined,
      }),
      replace: true,
    });
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Synced ${result.synced} ministries`);
      },
      onError: (err) => {
        toast.error(`Sync failed: ${err.message}`);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Org Units</h1>
          <p className="text-muted-foreground">
            Manage organizational units and their members.
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncMutation.isPending}
          variant="outline"
        >
          <IconRefresh
            className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
          />
          Sync Ministries
        </Button>
      </div>

      <Separator className="bg-bcgov-gold" />

      {isLoading && <p className="py-8 text-center">Loading…</p>}
      {error && (
        <p className="py-8 text-center text-destructive">
          Error: {error.message}
        </p>
      )}
      {data && (
        <OrgUnitsTable
          orgUnits={data.docs}
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}
