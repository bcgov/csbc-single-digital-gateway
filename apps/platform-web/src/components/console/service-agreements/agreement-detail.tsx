import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import { useAuth } from '@/lib/auth';
import {
  addAgreementVersion,
  agreementQueryOptions,
  publishAgreementVersion,
  type ServiceAgreementDetail,
  updateAgreementDraft,
} from '@/lib/service-agreements';
import { AgreementEditor } from './agreement-editor';
import type { AgreementScope } from './scope';

/** Detail page — gates render on the query so the editor mounts WITH the data (memory
 * client-first-composite-write); the body owns the version selection + edit/publish state. */
export function AgreementDetail({ scope, id }: { scope: AgreementScope; id: string }) {
  const query = useQuery(agreementQueryOptions(id));
  if (!query.isSuccess) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  return <AgreementBody scope={scope} id={id} detail={query.data} />;
}

function AgreementBody({
  scope,
  id,
  detail,
}: {
  scope: AgreementScope;
  id: string;
  detail: ServiceAgreementDetail;
}) {
  const { data: user } = useAuth();
  const isAdmin = user?.roles.includes('admin') ?? false;
  const queryClient = useQueryClient();
  const { versions, definition, agreement, services } = detail;
  const latest = versions[versions.length - 1];
  const [selectedId, setSelectedId] = useState(latest?.id ?? '');
  const selected = versions.find((v) => v.id === selectedId) ?? latest;

  const [formData, setFormData] = useState<Record<string, unknown>>(selected?.data ?? {});
  const [baseline, setBaseline] = useState<Record<string, unknown>>(selected?.data ?? {});
  // Reseed when the SELECTED version identity changes (switch versions, or a new one after add).
  // Not keyed on the query data, so a save-triggered refetch never clobbers in-progress edits.
  useEffect(() => {
    const v = versions.find((x) => x.id === selectedId);
    setFormData(v?.data ?? {});
    setBaseline(v?.data ?? {});
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = JSON.stringify(formData) !== JSON.stringify(baseline);
  const isGlobal = agreement.workspaceId === null;
  // A global agreement is admin-only to edit; otherwise a draft is editable.
  const editable = selected?.status === 'draft' && (!isGlobal || isAdmin);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['service-agreements', 'detail', id] });

  const save = useMutation({
    mutationFn: () => {
      if (selected === undefined) {
        throw new Error('No version selected');
      }
      const title = typeof formData.title === 'string' ? formData.title : undefined;
      return updateAgreementDraft(id, selected.id, { data: formData, ...(title ? { title } : {}) });
    },
    onSuccess: async () => {
      setBaseline(formData);
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ['service-agreements'] }),
      ]);
    },
  });

  const publish = useMutation({
    mutationFn: () => {
      if (selected === undefined) {
        throw new Error('No version selected');
      }
      return publishAgreementVersion(id, selected.id);
    },
    onSuccess: () => invalidate(),
  });

  const newVersion = useMutation({
    mutationFn: () => addAgreementVersion(id),
    onSuccess: async (created) => {
      await invalidate();
      setSelectedId(created.id);
    },
  });

  let backLink;
  if (scope.kind === 'service') {
    backLink = (
      <Link
        to="/app/$slug/services/$id/service-agreements"
        params={{ slug: scope.slug, id: scope.serviceId }}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Back to service
      </Link>
    );
  } else if (scope.kind === 'workspace') {
    backLink = (
      <Link
        to="/app/$slug/service-agreements"
        params={{ slug: scope.slug }}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All agreements
      </Link>
    );
  } else {
    backLink = (
      <Link
        to="/admin/service-agreements"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All agreements
      </Link>
    );
  }

  const busy = save.isPending || publish.isPending || newVersion.isPending;
  const latestPublished = latest?.status === 'published';
  const error = save.error ?? publish.error ?? newVersion.error;
  // When reached FROM a service, the agreement follows the service's lifecycle (like application
  // methods): edit the draft here, no publish/version workflow — the service publish publishes it.
  const showWorkflow = scope.kind !== 'service';

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4">
      <UnsavedChangesGuard when={dirty} />
      <div className="flex items-center justify-between gap-3">
        {backLink}
        <div className="flex items-center gap-2">
          {isGlobal ? <Badge variant="outline">Global</Badge> : null}
          {showWorkflow ? (
            <VersionPicker versions={versions} selectedId={selectedId} onSelect={setSelectedId} />
          ) : null}
          {showWorkflow && latestPublished && editableContext(isGlobal, isAdmin) ? (
            <Button
              size="sm"
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => newVersion.mutate()}
            >
              New version
            </Button>
          ) : null}
          {editable ? (
            <Button size="sm" type="button" disabled={!dirty || busy} onClick={() => save.mutate()}>
              {save.isPending ? <Spinner className="size-4" /> : null} Save
            </Button>
          ) : null}
          {showWorkflow && editable ? (
            <Button
              size="sm"
              type="button"
              disabled={dirty || busy}
              onClick={() => publish.mutate()}
            >
              {publish.isPending ? <Spinner className="size-4" /> : null} Publish
            </Button>
          ) : null}
        </div>
      </div>
      <h1 className="text-xl font-semibold">{agreement.title}</h1>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      <div className="rounded-xl border border-border bg-card p-6">
        <AgreementEditor
          definition={definition}
          data={formData}
          onChange={setFormData}
          readonly={!editable}
        />
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <span className="text-sm font-medium">Associated services</span>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not attached to any service yet — attach it from a service&apos;s Service agreements
            tab.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  to="/app/$slug/services/$id"
                  params={{ slug: service.workspaceSlug, id: service.id }}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {service.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Whether the current viewer can create a new version in this scope. */
function editableContext(isGlobal: boolean, isAdmin: boolean): boolean {
  return !isGlobal || isAdmin;
}

function VersionPicker({
  versions,
  selectedId,
  onSelect,
}: {
  versions: ServiceAgreementDetail['versions'];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = versions.find((v) => v.id === selectedId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" type="button" />}>
        Version v{selected?.version}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {versions.toReversed().map((version) => (
          <DropdownMenuItem
            key={version.id}
            className={version.id === selectedId ? 'font-semibold' : undefined}
            onClick={() => onSelect(version.id)}
          >
            v{version.version}
            <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
