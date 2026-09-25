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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Spinner } from '@repo/ui/spinner';
import type { StudioDocument } from '@repo/forms';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Pencil } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ConfirmDiscardDialog } from '@/components/console/confirm-discard-dialog';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import { VersionContent } from '@/components/console/version-content';
import type { CapabilityMap } from '@repo/forms';
import { sameStudioDocument, studioDocumentOf } from '@/lib/studio-content';
import { useAuth } from '@/lib/auth';
import { useSetPageChrome } from '@/lib/page-chrome';
import {
  addAgreementVersion,
  agreementQueryOptions,
  publishAgreementVersion,
  type ServiceAgreementDetail,
  updateAgreementDraft,
} from '@/lib/service-agreements';
import { AgreementDefaultToggle } from './agreement-default-toggle';
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
  const { versions, agreement } = detail;
  const latest = versions[versions.length - 1];
  const [selectedId, setSelectedId] = useState(latest?.id ?? '');
  const selected = versions.find((v) => v.id === selectedId) ?? latest;
  const governing =
    selected?.templateVersionId === null || selected?.templateVersionId === undefined
      ? undefined
      : (detail.definitions[selected.templateVersionId]?.capabilities as CapabilityMap | undefined);

  /**
   * Doc 218 rule 1: the document the studio last reported. `null` until it mounts and emits its
   * baseline, and reset on every version change so a stale document from the previous version can
   * never read as an edit to this one.
   *
   * This replaces the old `contentText`/`baseline` JSON-text pair: the content is a form document
   * now, authored as one, so there is no text to reseed and no parse that can fail.
   */
  const [live, setLive] = useState<StudioDocument | null>(null);
  /** An action waiting on the discard confirmation (rule 19). Stored as a thunk, hence the extra arrow. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  /**
   * Rule 11: what `dirty` compares against — the content as the server now holds it, rebuilt every
   * render. After a save the refetch makes it equal to `live` again, which is what turns Save back
   * off and Publish back on.
   */
  const stored = studioDocumentOf(selected?.content);
  /**
   * Rule 12: what the studio is SEEDED with — pinned to the version id, deliberately NOT to the
   * query data.
   *
   * `useStudioDocument` re-seeds on a REFERENTIAL change of `schema`/`uischema`, so handing it the
   * refetched objects after a save clears its element ids and the author's selection. `key` alone
   * does not prevent that: it only stops one version's document leaking into another. Both are
   * needed, and they are not the same guard.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the version id IS the identity of its content here.
  const seed = useMemo(() => stored, [selected?.id]);
  // Doc 221: the same order-insensitive comparison the template page needs — the server's zod parse
  // reorders keys, so a plain JSON.stringify left this page dirty forever after a successful save.
  const dirty = live !== null && !sameStudioDocument(live, stored);
  // Rule 20 (feature 177): read at block time through a ref, because a boolean captured at render can
  // still read stale `true` in the continuation after an awaited save.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const isDirty = useCallback(() => dirtyRef.current, []);

  const selectVersion = (versionId: string) => {
    setSelectedId(versionId);
    setLive(null);
  };
  /** Anything that would throw the current edits away asks first (rule 19). */
  const confirmed = (action: () => void) => (dirty ? setPending(() => action) : action());
  const isGlobal = agreement.workspaceId === null;
  // A global agreement is admin-only to edit; otherwise a draft is editable.
  const editable = selected?.status === 'draft' && (!isGlobal || isAdmin);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['service-agreements', 'detail', id] });

  const save = useMutation({
    mutationFn: (document: StudioDocument) => {
      if (selected === undefined) {
        throw new Error('No version selected');
      }
      return updateAgreementDraft(id, selected.id, { content: document });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ['service-agreements'] }),
      ]);
    },
  });
  const saveDraft = async () => {
    if (live !== null) {
      await save.mutateAsync(live);
    }
  };

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
      selectVersion(created.id);
    },
  });

  // Admin shell has no page-chrome breadcrumb bar → keep an inline back link there. The console
  // (workspace) scope uses the breadcrumb bar below instead (feature 149).
  const backLink =
    scope.kind === 'admin' ? (
      <Link
        to="/admin/service-agreements"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All agreements
      </Link>
    ) : null;

  const busy = save.isPending || publish.isPending || newVersion.isPending;
  const latestPublished = latest?.status === 'published';
  // A default resolves the agreement's current published version, so the toggle only offers published
  // agreements (feature 149); a workspace default belongs to a concrete workspace (never admin scope).
  const publishedAgreement = versions.some((v) => v.status === 'published');
  const error = save.error ?? publish.error ?? newVersion.error;

  // Console breadcrumb bar (workspace scope): Service agreements → this agreement, mirroring the
  // service detail (feature 44). No-ops in admin scope (no PageChromeProvider there).
  useSetPageChrome({
    title: agreement.title ?? 'Untitled',
    breadcrumb:
      scope.kind === 'workspace' ? (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link to="/app/$slug/service-agreements" params={{ slug: scope.slug }} />}
              >
                Service agreements
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{agreement.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : undefined,
  });

  return (
    // Doc 218 rule 16: full height — the studio sizes itself to its container, and the console
    // `<main>` is a flex child with a definite height. The header keeps its own height.
    <div className="flex h-full min-h-0 flex-col gap-4">
      <UnsavedChangesGuard when={isDirty} onSave={saveDraft} onDiscard={() => setLive(null)} />
      <ConfirmDiscardDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
      />
      <div className="flex shrink-0 items-center gap-3">
        {backLink}
        <div className="ml-auto flex items-center gap-2">
          {isGlobal ? <Badge color="grey">Global</Badge> : null}
          {scope.kind === 'workspace' ? (
            <AgreementDefaultToggle
              slug={scope.slug}
              workspaceId={scope.workspaceId}
              agreementDocumentId={id}
              published={publishedAgreement}
            />
          ) : null}
          <VersionPicker
            versions={versions}
            selectedId={selectedId}
            onSelect={(versionId) => confirmed(() => selectVersion(versionId))}
          />
          {latestPublished && editableContext(isGlobal, isAdmin) ? (
            <Button
              size="sm"
              type="button"
              disabled={busy}
              onClick={() => confirmed(() => newVersion.mutate())}
            >
              <Pencil className="size-4" aria-hidden />
              New version
            </Button>
          ) : null}
          {editable ? (
            <Button
              size="sm"
              type="button"
              disabled={!dirty || busy}
              // The rejection is CAUGHT here, and only here: the failure is already on screen through the
              // error banner, and an uncaught one from a click is an unhandled rejection. The guard's `onSave`
              // deliberately gets the rejecting promise, because its dialog stays open on failure.
              onClick={() => void saveDraft().catch(() => {})}
            >
              {save.isPending ? <Spinner className="size-4" /> : null} Save
            </Button>
          ) : null}
          {editable ? (
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
      {/* The page owns its title heading now that the console shell no longer renders one. */}
      {/* The title is generated from the version content, so it can be absent. */}
      <h1 className="shrink-0 text-xl font-semibold">{agreement.title ?? 'Untitled'}</h1>
      {error ? (
        <p role="alert" className="shrink-0 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      <div
        data-slot="agreement-content"
        className="min-h-0 flex-1 rounded-xl border border-border bg-background"
      >
        <VersionContent
          key={selected?.id}
          document={seed}
          editable={editable}
          onDocumentChange={setLive}
          // Doc 221: the template THIS version is pinned to (doc 217), looked up in `definitions` —
          // never whichever template happens to be published now, or a template author tightening
          // permissions would retroactively re-govern documents already built from an earlier one.
          governedBy={governing}
        />
      </div>
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
        Version v{selected?.versionNumber}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {versions.toReversed().map((version) => (
          <DropdownMenuItem
            key={version.id}
            className={version.id === selectedId ? 'font-semibold' : undefined}
            onClick={() => onSelect(version.id)}
          >
            v{version.versionNumber}
            <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
