import { Button, Separator, Spinner } from "@repo/ui";
import { IconPlus, IconUserPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../../api/api.client";
import { AddContributorDialog } from "../../../../../../features/admin/consent-documents/components/add-contributor-dialog.component";
import { ContributorsTable } from "../../../../../../features/admin/consent-documents/components/contributors-table.component";
import { DocVersionsTable } from "../../../../../../features/admin/consent-documents/components/doc-versions-table.component";
import { RemoveContributorDialog } from "../../../../../../features/admin/consent-documents/components/remove-contributor-dialog.component";
import {
  useCreateDocVersion,
  useRemoveContributor,
} from "../../../../../../features/admin/consent-documents/data/consent-documents.mutations";
import {
  consentDocumentContributorsQueryOptions,
  consentDocumentQueryOptions,
} from "../../../../../../features/admin/consent-documents/data/consent-documents.query";
import type { Contributor } from "../../../../../../features/admin/consent-documents/data/consent-documents.query";
import { queryClient } from "../../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/admin/consent/documents/$docId/",
)({
  loader: async ({ params }) => {
    const doc = await queryClient.ensureQueryData(
      consentDocumentQueryOptions(params.docId),
    );
    return { docName: doc.name };
  },
  staticData: {
    breadcrumbs: (loaderData: unknown) => [
      { label: "Consent Documents", to: "/admin/consent/documents" },
      { label: (loaderData as { docName: string | null })?.docName ?? "Detail" },
    ],
  },
  component: DocumentDetailPage,
});

function DocumentDetailPage() {
  const { docId } = Route.useParams();
  const navigate = useNavigate();
  const [contributorToRemove, setContributorToRemove] =
    useState<Contributor | null>(null);

  const { data: doc, isLoading, error } = useQuery(
    consentDocumentQueryOptions(docId),
  );

  const { data: contributors } = useQuery(
    consentDocumentContributorsQueryOptions(docId),
  );

  const { data: orgUnit } = useQuery({
    queryKey: ["org-units", doc?.orgUnitId],
    queryFn: async () => {
      const { data } = await api.get(`/admin/org-units/${doc!.orgUnitId}`);
      return data as { id: string; name: string };
    },
    enabled: !!doc?.orgUnitId,
  });

  const { data: docType } = useQuery({
    queryKey: ["consent-document-types", doc?.consentDocumentTypeId],
    queryFn: async () => {
      const { data } = await api.get(
        `/admin/consent/document-types/${doc!.consentDocumentTypeId}`,
      );
      const enTranslation = data.publishedVersion?.translations?.find(
        (t: { locale: string }) => t.locale === "en",
      );
      return { id: data.id, name: enTranslation?.name ?? data.id } as {
        id: string;
        name: string;
      };
    },
    enabled: !!doc?.consentDocumentTypeId,
  });

  const createVersionMutation = useCreateDocVersion(docId);
  const removeMutation = useRemoveContributor(docId);

  const handleCreateVersion = () => {
    createVersionMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Version v${result.version} created`);
        void navigate({
          to: "/admin/consent/documents/$docId/versions/$versionId",
          params: { docId, versionId: result.id },
        });
      },
      onError: (err) => {
        toast.error(`Failed to create version: ${err.message}`);
      },
    });
  };

  const handleRemoveConfirm = () => {
    if (!contributorToRemove) return;
    removeMutation.mutate(contributorToRemove.userId, {
      onSuccess: () => {
        toast.success(
          `Removed ${contributorToRemove.name ?? contributorToRemove.email ?? "contributor"}`,
        );
        setContributorToRemove(null);
      },
      onError: (err) => {
        toast.error(`Failed to remove: ${err.message}`);
      },
    });
  };

  if (isLoading) return <p className="py-8 text-center">Loading…</p>;
  if (error)
    return (
      <p className="py-8 text-center text-destructive">
        Error: {error.message}
      </p>
    );
  if (!doc) return null;

  const latestVersion = doc.versions.length
    ? doc.versions.reduce((a, b) => (b.version > a.version ? b : a))
    : null;
  const title =
    doc.publishedVersion?.name ??
    latestVersion?.name ??
    doc.name ??
    "Consent Document";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">ID: {doc.id}</p>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Details</h2>
        <div className="flex flex-col gap-px border bg-border">
          <div className="grid grid-cols-3 gap-px">
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Org Unit
              </p>
              <p className="font-medium text-sm break-all">
                {orgUnit ? orgUnit.name : <Spinner className="mt-1" />}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Document Type
              </p>
              <p className="font-medium text-sm break-all">
                {docType ? docType.name : <Spinner className="mt-1" />}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="text-sm font-bold text-muted-foreground">
                Created
              </p>
              <p className="font-medium">
                {new Date(doc.createdAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Versions</h2>
          <Button
            onClick={handleCreateVersion}
            disabled={createVersionMutation.isPending}
            variant="outline"
          >
            <IconPlus className="size-4" />
            Create Version
          </Button>
        </div>

        <DocVersionsTable docId={docId} versions={doc.versions} />
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Contributors</h2>
          <AddContributorDialog
            docId={docId}
            trigger={
              <Button variant="outline">
                <IconUserPlus className="size-4" />
                Add Contributor
              </Button>
            }
          />
        </div>

        {contributors && (
          <ContributorsTable
            contributors={contributors}
            onRemove={(c) => setContributorToRemove(c)}
          />
        )}
      </div>

      <RemoveContributorDialog
        contributor={contributorToRemove}
        isPending={removeMutation.isPending}
        onConfirm={handleRemoveConfirm}
        onCancel={() => setContributorToRemove(null)}
      />
    </div>
  );
}
