import { Badge } from '@repo/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@repo/ui/breadcrumb';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  addServiceVersion,
  publishVersion,
  serviceAgreementRefsQueryOptions,
  serviceQueryOptions,
  serviceReferencesQueryOptions,
  updateDraft,
} from '@/lib/services';
import { useSetPageChrome } from '@/lib/page-chrome';
import { UnsavedChangesGuard } from '../unsaved-changes-guard';
import { ApplicationMethods } from './application-methods';
import { ServiceAgreementMethods } from './service-agreement-methods';
import { ServiceEditor } from './service-editor';
import { ServiceMenu } from './service-menu';
import { ServicePublishModal } from './service-publish-modal';
import { VersionPicker } from './version-picker';

/** Reconcile a held application-method order against the current membership (feature 132): keep the
 * existing relative order for ids still present (drops removed ids), then append any new ids in
 * server order. A pure reorder (same id set) leaves both order arrays untouched by the reseed effect;
 * a create/delete folds the change into BOTH order + baseline so it isn't seen as an unsaved reorder. */
function reconcileOrder(previous: string[], present: string[]): string[] {
  const presentSet = new Set(present);
  const kept = previous.filter((methodId) => presentSet.has(methodId));
  const keptSet = new Set(kept);
  return [...kept, ...present.filter((methodId) => !keptSet.has(methodId))];
}

/** Service detail — the version is in the URL (`…/versions/:versionId`). Header carries a version
 * picker, a "Go to current" shortcut when off the latest, Create-next-version, and the ⋯ menu. */
export function ServiceDetail({
  slug,
  id,
  versionId,
  tab,
}: {
  slug: string;
  id: string;
  /** Omitted on the bare `…/services/:id` route → the current (latest) version. */
  versionId?: string;
  /** Which tab the URL selects. */
  tab: 'details' | 'methods' | 'agreements';
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery(serviceQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] });

  const versions = data?.versions ?? [];
  const latest = versions[versions.length - 1];
  // The bare route (no versionId) shows the current/latest version; older versions are URL-addressed.
  const selected = versionId === undefined ? latest : versions.find((v) => v.id === versionId);

  // Navigate to a version+tab. The current/latest version is the bare `…/services/:id` (no version in
  // the URL); older versions are `…/versions/:versionId`. Each tab adds `/application-methods`.
  const navTab = (nextTab: 'details' | 'methods' | 'agreements', vId?: string) => {
    const older = vId !== undefined && vId !== latest?.id;
    if (older) {
      if (nextTab === 'methods') {
        navigate({
          to: '/app/$slug/services/$id/versions/$versionId/application-methods',
          params: { slug, id, versionId: vId },
        });
      } else if (nextTab === 'agreements') {
        navigate({
          to: '/app/$slug/services/$id/versions/$versionId/service-agreements',
          params: { slug, id, versionId: vId },
        });
      } else {
        navigate({
          to: '/app/$slug/services/$id/versions/$versionId',
          params: { slug, id, versionId: vId },
        });
      }
    } else if (nextTab === 'methods') {
      navigate({ to: '/app/$slug/services/$id/application-methods', params: { slug, id } });
    } else if (nextTab === 'agreements') {
      navigate({ to: '/app/$slug/services/$id/service-agreements', params: { slug, id } });
    } else {
      navigate({ to: '/app/$slug/services/$id', params: { slug, id } });
    }
  };
  const goToCurrent = () => navTab(tab);
  const goToVersion = (vId: string) => navTab(tab, vId);

  const referencesQuery = useQuery({
    ...serviceReferencesQueryOptions(id, selected?.id ?? ''),
    enabled: selected !== undefined,
  });
  const references = referencesQuery.data ?? [];
  const agreementRefsQuery = useQuery({
    ...serviceAgreementRefsQueryOptions(id, selected?.id ?? ''),
    enabled: selected !== undefined,
  });
  const agreementCount = agreementRefsQuery.data?.length ?? 0;

  const addVersion = useMutation({
    mutationFn: () => addServiceVersion(id),
    onSuccess: async () => {
      await invalidate();
      navTab('details');
    },
  });

  // Editable form state for the selected version (lifted here so Save draft / Publish live in the header).
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formBaseline, setFormBaseline] = useState<Record<string, unknown>>({});
  const [publishOpen, setPublishOpen] = useState(false);
  useEffect(() => {
    setFormData(selected?.data ?? {});
    setFormBaseline(selected?.data ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed only when the version changes
  }, [selected?.id]);

  // Application-method order (feature 132): drag reorders this held list; it's saved with the service.
  const appMethodIds = references
    .filter((ref) => ref.relation === 'application_form' || ref.relation === 'external_application')
    .map((ref) => ref.id);
  const [methodOrder, setMethodOrder] = useState<string[]>([]);
  const [methodOrderBaseline, setMethodOrderBaseline] = useState<string[]>([]);
  // Reseed/reconcile whenever the version changes or a method is created/deleted (the id SET changes);
  // a pure drag keeps the same set, so this effect leaves the dragged order alone.
  const appMethodKey = appMethodIds.toSorted().join(',');
  useEffect(() => {
    setMethodOrder((previous) => reconcileOrder(previous, appMethodIds));
    setMethodOrderBaseline((previous) => reconcileOrder(previous, appMethodIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconcile on version/membership change
  }, [selected?.id, appMethodKey]);

  const dirty =
    JSON.stringify(formData) !== JSON.stringify(formBaseline) ||
    methodOrder.join(',') !== methodOrderBaseline.join(',');

  const save = useMutation({
    mutationFn: () => {
      const title = typeof formData.title === 'string' ? formData.title.trim() : '';
      if (title === '') {
        throw new Error('A service title is required');
      }
      if (!selected) {
        throw new Error('No version selected');
      }
      return updateDraft(id, selected.id, { data: formData, title, applicationOrder: methodOrder });
    },
    onSuccess: async () => {
      setFormBaseline(formData);
      setMethodOrderBaseline(methodOrder);
      await invalidate();
    },
  });
  const publish = useMutation({
    mutationFn: () => {
      if (!selected) {
        throw new Error('No version selected');
      }
      return publishVersion(id, selected.id);
    },
    onSuccess: async () => {
      setPublishOpen(false);
      await invalidate();
    },
  });
  const busy = save.isPending || publish.isPending;

  const serviceTitle = data?.service.title ?? 'Service';
  // Drive the top bar (title/description) + the full-width breadcrumb bar for this nested page.
  useSetPageChrome({
    title: serviceTitle,
    description: data?.service.description ? data.service.description : undefined,
    breadcrumb: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/app/$slug/services" params={{ slug }} />}>
              Services
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{serviceTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  });

  if (!data) {
    return null;
  }
  if (!selected) {
    return <p className="p-6 text-sm text-muted-foreground">This version no longer exists.</p>;
  }

  const orderIndex = new Map(methodOrder.map((methodId, i) => [methodId, i]));
  const applicationRefs = references
    .filter((ref) => ref.relation === 'application_form' || ref.relation === 'external_application')
    // Display in the held (drag) order; unknown ids (not yet reconciled) fall to the end.
    .toSorted((a, b) => (orderIndex.get(a.id) ?? Infinity) - (orderIndex.get(b.id) ?? Infinity));
  const isLatest = selected.id === latest?.id;
  const readonly = selected.status !== 'draft';
  const publishApplications = applicationRefs.map((ref) => ({
    title: ref.targetTitle,
    hasStructure: ref.hasStructure,
  }));

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        {save.isError ? (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {save.error.message}
          </p>
        ) : null}
        {/* Editing a draft → separate Save draft / Publish service, left of the version controls. */}
        {readonly ? null : (
          <>
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={!dirty || busy}
              onClick={() => save.mutate()}
            >
              Save draft
            </Button>
            <Button
              size="sm"
              type="button"
              disabled={dirty || busy}
              onClick={() => setPublishOpen(true)}
            >
              Publish service
            </Button>
          </>
        )}
        <ButtonGroup>
          {/* Current + published → start a new draft to edit; mutually exclusive with Go to current. */}
          {isLatest && latest?.status === 'published' ? (
            <Button
              size="sm"
              type="button"
              disabled={addVersion.isPending}
              onClick={() => addVersion.mutate()}
            >
              <Pencil className="size-4" aria-hidden />
              Edit service details
            </Button>
          ) : null}
          {!isLatest && latest ? (
            <Button size="sm" variant="outline" type="button" onClick={goToCurrent}>
              Go to current
            </Button>
          ) : null}
          <VersionPicker versions={versions} selectedId={selected.id} onSelect={goToVersion} />
        </ButtonGroup>
        <ServiceMenu
          serviceId={id}
          versionId={selected.id}
          canDiscard={selected.status === 'draft' && versions.length > 1}
          hasSubmissions={data.hasSubmissions}
          archived={versions.length > 0 && versions.every((v) => v.status === 'archived')}
          latestPublished={latest?.publishedAt != null}
          onDeleted={() => navigate({ to: '/app/$slug/services', params: { slug } })}
          onDiscarded={() => navTab('details')}
          // Abandoning the version/service → drop unsaved edits so the guard doesn't re-prompt.
          onConfirmDestroy={() => setFormBaseline(formData)}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) =>
          navTab(value === 'methods' || value === 'agreements' ? value : 'details', versionId)
        }
        className="gap-4"
      >
        <TabsList>
          <TabsTrigger value="details">Service details</TabsTrigger>
          <TabsTrigger value="methods">
            Application methods
            <Badge color="yellow" className="ml-2">
              {applicationRefs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="agreements">
            Service agreements
            <Badge color="yellow" className="ml-2">
              {agreementCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="flex flex-col gap-4">
          {referencesQuery.isSuccess ? (
            <ServiceEditor
              definition={data.definition}
              data={formData}
              onChange={setFormData}
              readonly={readonly}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="methods">
          {referencesQuery.isSuccess ? (
            <ApplicationMethods
              slug={slug}
              serviceId={id}
              versionId={selected.id}
              references={applicationRefs}
              readonly={readonly}
              onReorder={setMethodOrder}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="agreements">
          {referencesQuery.isSuccess ? (
            <ServiceAgreementMethods
              slug={slug}
              serviceId={id}
              versionId={selected.id}
              workspaceId={data.service.workspaceId}
              readonly={readonly}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      <ServicePublishModal
        open={publishOpen}
        onOpenChange={setPublishOpen}
        applications={publishApplications}
        onConfirm={() => publish.mutate()}
        publishing={publish.isPending}
        error={publish.error}
      />
      {/* Switching tabs/versions or leaving with unsaved form edits prompts before discarding. */}
      <UnsavedChangesGuard when={dirty} />
    </div>
  );
}
