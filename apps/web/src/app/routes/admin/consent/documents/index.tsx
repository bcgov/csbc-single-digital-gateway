import { Button, Separator } from "@repo/ui";
import { IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CreateDocumentDialog } from "../../../../../features/admin/consent-documents/components/create-document-dialog.component";
import { DeleteDocumentDialog } from "../../../../../features/admin/consent-documents/components/delete-document-dialog.component";
import { DocumentsFilterBar } from "../../../../../features/admin/consent-documents/components/documents-filter-bar.component";
import { DocumentsTable } from "../../../../../features/admin/consent-documents/components/documents-table.component";
import { useDeleteConsentDocument } from "../../../../../features/admin/consent-documents/data/consent-documents.mutations";
import { consentDocumentsQueryOptions } from "../../../../../features/admin/consent-documents/data/consent-documents.query";

const SearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  orgUnitId: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/admin/consent/documents/")({
  validateSearch: (search) => SearchSchema.parse(search),
  staticData: {
    breadcrumbs: () => [{ label: "Consent Documents" }],
  },
  component: DocumentsListPage,
});

function DocumentsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/consent/documents" });

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
    consentDocumentsQueryOptions(currentPage, 10, filters),
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

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const deleteMutation = useDeleteConsentDocument();

  const handleCreated = (doc: { id: string }) => {
    void navigate({
      to: "/admin/consent/documents/$docId",
      params: { docId: doc.id },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Consent Documents</h1>
          <p className="text-muted-foreground">
            Manage consent documents across org units.
          </p>
        </div>
        <CreateDocumentDialog
          onCreated={handleCreated}
          trigger={
            <Button className="bg-bcgov-blue hover:bg-bcgov-blue/80">
              <IconPlus className="size-4" />
              Create Document
            </Button>
          }
        />
      </div>

      <Separator className="bg-bcgov-gold" />

      <DocumentsFilterBar
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
        <DocumentsTable
          documents={data.docs}
          currentPage={data.page}
          totalPages={data.totalPages}
          onPageChange={goToPage}
          onDelete={setDeletingDocId}
        />
      )}
      <DeleteDocumentDialog
        docId={deletingDocId}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deletingDocId) return;
          deleteMutation.mutate(deletingDocId, {
            onSuccess: () => {
              toast.success("Document deleted.");
              setDeletingDocId(null);
            },
            onError: (error) => {
              toast.error(error.message || "Failed to delete document.");
            },
          });
        }}
        onCancel={() => setDeletingDocId(null)}
      />
    </div>
  );
}
