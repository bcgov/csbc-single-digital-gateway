import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CreateDocumentTypeDialog } from "../../../../../../features/admin/consent-document-types/components/create-document-type-dialog.component";
import { DeleteDocumentTypeDialog } from "../../../../../../features/admin/consent-document-types/components/delete-document-type-dialog.component";
import { DocumentTypesTable } from "../../../../../../features/admin/consent-document-types/components/document-types-table.component";
import { useDeleteDocumentType } from "../../../../../../features/admin/consent-document-types/data/consent-document-types.mutations";
import { documentTypesQueryOptions } from "../../../../../../features/admin/consent-document-types/data/consent-document-types.query";

const SearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute(
  "/admin/settings/consent/document-types/",
)({
  validateSearch: (search) => SearchSchema.parse(search),
  staticData: {
    breadcrumbs: () => [
      { label: "Settings", to: "/admin/settings" },
      { label: "Document Types" },
    ],
  },
  component: DocumentTypesListPage,
});

function DocumentTypesListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({
    from: "/admin/settings/consent/document-types",
  });

  const currentPage = search.page ?? 1;
  const { data, isLoading, error } = useQuery(
    documentTypesQueryOptions(currentPage),
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
  const deleteMutation = useDeleteDocumentType();

  const handleCreated = (result: { id: string }) => {
    void navigate({
      to: "/admin/settings/consent/document-types/$typeId",
      params: { typeId: result.id },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Consent Document Types</h1>
          <p className="text-muted-foreground">
            Manage consent document type definitions and their versions.
          </p>
        </div>
        <CreateDocumentTypeDialog
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
        <DocumentTypesTable
          types={data.data}
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          onDelete={setDeletingTypeId}
        />
      )}
      <DeleteDocumentTypeDialog
        typeId={deletingTypeId}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingTypeId) return;
          deleteMutation.mutate(deletingTypeId, {
            onSuccess: () => {
              toast.success("Document type deleted.");
              setDeletingTypeId(null);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to delete document type.");
            },
          });
        }}
        onCancel={() => setDeletingTypeId(null)}
      />
    </div>
  );
}
