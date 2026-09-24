import type { StudioDocument } from '@repo/forms';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ConfirmDiscardDialog } from '@/components/console/confirm-discard-dialog';
import { UnsavedChangesGuard } from '@/components/console/unsaved-changes-guard';
import { VersionContent } from '@/components/console/version-content';
import { studioDocumentOf } from '@/lib/studio-content';
import {
  addVersion,
  adminTemplateQueryOptions,
  editDraft,
  publishVersion,
  type TemplateVersion,
} from '@/lib/templates';

/** Header dropdown to switch the selected version (newest first). */
function VersionDropdown({
  versions,
  selectedId,
  onSelect,
}: {
  versions: TemplateVersion[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const selected = versions.find((version) => version.id === selectedId);
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

/**
 * Admin Template detail — a version dropdown + lifecycle actions in the header, over the version's content.
 *
 * Doc 218: the content is authored in the **Form Studio** for a draft and read in a **disabled FormRunner** for a
 * published or archived version. The Monaco JSON editor this replaced could produce payloads the API rejects — its
 * root-type rule (`service → Service`, `application-method → Form|Flow`, `service-agreement → Form`) is the real
 * contract, and the studio can only build roots that satisfy it. Raw JSON is still reachable, in the studio's own
 * code panel (doc 191).
 */
/**
 * Doc 220: this page is the TEMPLATE surface, so every document it opens has authorable permissions.
 * It seeds `capabilities ?? {}` so a template that has never had a rule can still grow one.
 */
const seededContent = (document: StudioDocument | null): StudioDocument | null =>
  document === null ? null : { ...document, capabilities: document.capabilities ?? {} };

/**
 * The same document reduced to what a CHANGE means: an EMPTY capability map and no map at all say
 * the same thing, so neither counts as an edit.
 *
 * Normalising BOTH sides, not just the stored one. The studio reports its document on mount as the
 * BASELINE (doc 218 rules 1-2), and that emit carries the `{}` this page seeded — comparing it
 * against a stored row with no `capabilities` key would make the page dirty from the first paint,
 * with no edit at all. FOUND BY HAND in the browser: the page refused to navigate away from a form
 * nobody had touched. The reverse is just as real — a studio that does NOT echo the key must not
 * read as an edit either, which is what a one-sided fix got wrong.
 */
const comparable = (document: StudioDocument | null): object | null => {
  if (document === null) return null;
  const { capabilities, ...halves } = document;
  const governed = capabilities !== undefined && Object.keys(capabilities).length > 0;
  return governed ? { ...halves, capabilities } : halves;
};

export function AdminTemplateDetail() {
  const { id } = useParams({ from: '/admin/templates/$id' });
  const queryClient = useQueryClient();
  const { data } = useQuery(adminTemplateQueryOptions(id));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });

  const versions = data?.versions ?? [];
  const latest = versions.at(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = versions.find((version) => version.id === selectedId) ?? latest;

  /**
   * The document the studio last reported (doc 218 rule 1). `null` until it mounts and emits its baseline, and
   * reset on every version change so a stale document from the previous version can never read as an edit to this
   * one — the remount alone would leave one render showing the wrong pairing.
   */
  const [live, setLive] = useState<StudioDocument | null>(null);
  /** An action waiting on the discard confirmation (rule 19). Stored as a thunk, hence the extra arrow. */
  const [pending, setPending] = useState<(() => void) | null>(null);

  /**
   * Rule 11: what `dirty` compares against — the content as the server now holds it, rebuilt every render. After a
   * save the refetch makes it equal to `live` again, which is what turns Save draft back off and Publish back on.
   */
  const stored = studioDocumentOf(selected?.content);
  /**
   * Rule 12: what the studio is SEEDED with — pinned to the version id, deliberately NOT to the query data.
   *
   * `useStudioDocument` re-seeds on a REFERENTIAL change of `schema`/`uischema`, so handing it the refetched
   * objects after a save clears its element ids and the author's selection. `key` alone does not prevent that: it
   * only stops one version's document leaking into another. Both are needed, and they are not the same guard.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the version id IS the identity of its content here.
  const seed = useMemo(() => seededContent(stored), [selected?.id]);
  const dirty =
    live !== null && JSON.stringify(comparable(live)) !== JSON.stringify(comparable(stored));
  // Rule 20 (feature 177): the guard reads `when` at block time through a ref, because a boolean captured at render
  // can still read stale `true` in the continuation after an awaited save.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const isDirty = useCallback(() => dirtyRef.current, []);

  const selectVersion = (versionId: string) => {
    setSelectedId(versionId);
    setLive(null);
  };
  /** Anything that would throw the current edits away asks first (rule 19). */
  const confirmed = (action: () => void) => (dirty ? setPending(() => action) : action());

  const save = useMutation({
    mutationFn: (document: StudioDocument) => {
      if (selected === undefined) {
        throw new Error('No version selected.');
      }
      return editDraft(id, selected.id, document);
    },
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: (versionId: string) => publishVersion(id, versionId),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: () => addVersion(id, selected?.content ?? {}),
    onSuccess: async (version) => {
      selectVersion(version.id);
      await invalidate();
    },
  });
  const busy = save.isPending || publish.isPending || add.isPending;

  const saveDraft = async () => {
    if (live !== null) {
      await save.mutateAsync(live);
    }
  };

  if (!data) {
    return null;
  }

  const isDraft = selected?.status === 'draft';
  const isLatest = selected?.id === latest?.id;

  return (
    // Doc 218 rule 16: full height — the studio sizes itself to its container, and the admin `<main>` is a flex
    // child with a definite height. The header keeps its own height; the body takes the rest.
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Leaving the page offers the save too — only a draft can ever be dirty, so `saveDraft` is always the right
          action here, and a rejection keeps the dialog open with the reason in view. */}
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
      <div className="flex shrink-0 flex-col gap-4">
        <Link
          to="/admin/templates"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Templates
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* The name is generated from the version content, so it can be absent. */}
            <h2 className="text-lg font-semibold">{latest?.title ?? 'Untitled'}</h2>
            <Badge color="yellow">{data.template.type}</Badge>
            {/* The selected version's status, which the old page said in words beside the editor. A
                disabled runner already shows that it cannot be filled; this says WHY. */}
            {selected ? <Badge color="grey">{selected.status}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            {save.isError ? (
              <p role="alert" className="mr-auto text-sm text-destructive">
                {save.error.message}
              </p>
            ) : null}
            {/* Editing a draft → Save draft / Publish, left of the version controls. */}
            {isDraft && selected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={!dirty || busy}
                  // The rejection is CAUGHT here, and only here: the failure is already on screen through
                  // `save.isError`, and an uncaught one from a click is an unhandled rejection. The guard's
                  // `onSave` deliberately gets the rejecting promise, because its dialog stays open on failure.
                  onClick={() => void saveDraft().catch(() => {})}
                >
                  Save draft
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={dirty || busy}
                  onClick={() => publish.mutate(selected.id)}
                >
                  Publish
                </Button>
              </>
            ) : null}
            <ButtonGroup>
              {!isLatest && latest ? (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => confirmed(() => selectVersion(latest.id))}
                >
                  Go to current
                </Button>
              ) : null}
              {selected ? (
                <VersionDropdown
                  versions={versions}
                  selectedId={selected.id}
                  onSelect={(versionId) => confirmed(() => selectVersion(versionId))}
                />
              ) : null}
            </ButtonGroup>
            {/* Latest version, not a draft → start a new draft version. */}
            {isLatest && !isDraft ? (
              <Button
                size="sm"
                type="button"
                disabled={add.isPending}
                onClick={() => confirmed(() => add.mutate())}
              >
                <Plus className="size-4" aria-hidden />
                New version
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        data-slot="template-content"
        className="min-h-0 flex-1 border border-border bg-background"
      >
        <VersionContent
          key={selected?.id}
          document={seed}
          editable={isDraft}
          onDocumentChange={setLive}
          // Doc 220: this page IS the template surface, so its documents always have authorable
          // permissions. `?? {}` is what lets a template that has never had a rule grow one — a
          // non-empty map could not express "a template with nothing written yet".
          capabilities={seed?.capabilities ?? {}}
        />
      </div>
    </div>
  );
}
