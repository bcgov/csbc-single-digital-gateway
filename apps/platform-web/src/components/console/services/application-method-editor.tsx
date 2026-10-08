import type { DocumentContent } from '@repo/documents/content';
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
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import { governingOf, VersionContent } from '@/components/console/version-content';
import { formQueryOptions, type FormWithVersion, updateFormDraft } from '@/lib/forms';
import { useSetPageChrome } from '@/lib/page-chrome';
import { type ServiceDetail, type ServiceVersion, serviceQueryOptions } from '@/lib/services';
import { documentContentOf, sameDocumentContent } from '@/lib/studio-content';

interface EditorParams {
  readonly slug: string;
  readonly id: string;
  readonly versionId: string;
  readonly methodId: string;
}

/**
 * Doc 288 — an application method authored in the Document Studio, under the service version that lists it. The
 * agreement page's draft lifecycle (doc 276) without versioning: the forms API saves a draft and nothing more.
 *
 * Gates on BOTH queries (rule 2) so the studio mounts WITH its content.
 */
export function ApplicationMethodEditor(params: EditorParams) {
  const { slug, id, versionId, methodId } = params;
  const method = useQuery(formQueryOptions(methodId));
  const service = useQuery(serviceQueryOptions(id));
  const serviceVersion = service.data?.versions.find((version) => version.id === versionId);
  useMethodChrome(params, service.data, serviceVersion, method.data, method.isError);

  if (method.isError || service.isError || (service.isSuccess && serviceVersion === undefined)) {
    // Rule 3.
    return (
      <p className="text-sm text-muted-foreground">
        Application method not found.{' '}
        <Link
          to="/app/$slug/services/$id/versions/$versionId/edit"
          params={{ slug, id, versionId }}
          className="text-foreground underline"
        >
          Back to the service version
        </Link>
      </p>
    );
  }
  if (!method.isSuccess || serviceVersion === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  return (
    <EditorBody
      key={method.data.version.id}
      methodId={methodId}
      detail={method.data}
      serviceDraft={serviceVersion.status === 'draft'}
    />
  );
}

function EditorBody({
  methodId,
  detail,
  serviceDraft,
}: {
  methodId: string;
  detail: FormWithVersion;
  serviceDraft: boolean;
}) {
  const queryClient = useQueryClient();
  const { form, version } = detail;
  // Rule 5: a published service's application form must not change under it.
  const editable = version.status === 'draft' && serviceDraft;
  const governing = governingOf(detail.definition);

  /** Rule 7: the studio's last report — its first emit is the baseline. */
  const [live, setLive] = useState<DocumentContent | null>(null);
  /** Rule 6: what `dirty` compares against, rebuilt every render, so a refetch after Save cleans it. */
  const stored = documentContentOf(version.content);
  /** Rule 6: what the studio is SEEDED with — pinned to the version id, never to the query data's identity. */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the version id IS the identity of its content here.
  const seed = useMemo(() => stored, [version.id]);
  const dirty = editable && live !== null && !sameDocumentContent(live, stored);
  // Rule 9 (feature 177 rule 20): read at block time through a ref, never a boolean captured at render.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const isDirty = useCallback(() => dirtyRef.current, []);

  const save = useMutation({
    mutationFn: (content: DocumentContent) => updateFormDraft(methodId, version.id, { content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms', 'detail', methodId] }),
  });
  const saveDraft = async () => {
    if (live !== null) await save.mutateAsync(live);
  };

  return (
    // Full height: the studio sizes itself to its container, as on the agreement page.
    <div className="flex h-full min-h-0 flex-col gap-4">
      <UnsavedChangesGuard when={isDirty} onSave={saveDraft} />
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{form.title ?? 'Untitled'}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Badge color="grey">{version.status}</Badge>
          {editable ? (
            <Button
              size="sm"
              type="button"
              disabled={!dirty || save.isPending}
              // Caught here: the failure is already on screen through the alert below.
              onClick={() => void saveDraft().catch(() => {})}
            >
              {save.isPending ? <Spinner className="size-4" /> : null} Save
            </Button>
          ) : null}
        </div>
      </div>
      {save.error ? (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {save.error.message}
        </p>
      ) : null}
      <div
        data-slot="application-method-content"
        className="min-h-0 flex-1 rounded-xl border border-border bg-background"
      >
        <VersionContent
          document={seed}
          kind="document"
          type="services.service-application-method"
          editable={editable}
          onDocumentChange={setLive}
          // Doc 221: the template THIS version is pinned to, never whichever is published now.
          governedBy={governing}
        />
      </div>
    </div>
  );
}

/** Rule 11: Services › service › vN › method. */
function useMethodChrome(
  { slug, id, versionId }: EditorParams,
  service: ServiceDetail | undefined,
  serviceVersion: ServiceVersion | undefined,
  method: FormWithVersion | undefined,
  methodFailed: boolean,
) {
  const serviceTitle = service?.service.title ?? 'Service';
  const methodTitle = methodFailed ? 'Not found' : (method?.form.title ?? 'Untitled');
  // `useSetPageChrome` re-pushes the breadcrumb only when the TITLE changes, so the title waits for BOTH queries to
  // settle: keyed on the method alone, a service arriving after it left the crumbs on their fallbacks (found by hand
  // on a cold load).
  const ready = service !== undefined && (method !== undefined || methodFailed);
  useSetPageChrome({
    title: ready ? methodTitle : '',
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
            <BreadcrumbLink
              render={<Link to="/app/$slug/services/$id/details" params={{ slug, id }} />}
            >
              {serviceTitle}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <Link
                  to="/app/$slug/services/$id/versions/$versionId/edit"
                  params={{ slug, id, versionId }}
                />
              }
            >
              {serviceVersion === undefined ? 'Version' : `v${serviceVersion.versionNumber}`}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{methodTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  });
}
