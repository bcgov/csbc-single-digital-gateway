import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/alert-dialog';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Spinner } from '@repo/ui/spinner';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';

/** The API's answer to "what may be deleted, and why not" (doc 225 rule 7, doc 227). */
export interface DocumentDeletable {
  /** Whether the whole document may go. */
  document: boolean;
  /** Why it may not, ready to show. Absent exactly when `document` is true. */
  reason?: string;
  /** The versions that may be deleted on their own — empty when there is only one. */
  versionIds: string[];
}

/** What the dialog calls the document: its full name, and the short one used mid-sentence. */
export interface DocumentNoun {
  /** "service agreement" — the dialog title. */
  readonly full: string;
  /** "agreement" — the description and the confirm button. */
  readonly short: string;
}

/**
 * Doc 225 rules 8-12, shared with templates by doc 227 — deleting a document, or one of its
 * versions, from its detail page.
 *
 * WHAT MAY GO IS THE API'S ANSWER (`deletable`), never this component's arithmetic. It turns on
 * things the browser cannot see (consents, workspace defaults, documents built from a template), so
 * a count of `versions` here would disagree with the endpoint that refuses.
 *
 * One version → "Delete". More than one → "Delete version <n>" for the version on screen, and when
 * the whole document may ALSO go that button becomes an attached group whose right-hand item opens
 * the document delete. Nothing deletable → no button, and the reason instead: an affordance the
 * author cannot act on is chrome.
 */
export function DocumentDeleteButton({
  noun,
  deletable,
  versionCount,
  selected,
  deleteDocument,
  deleteVersion,
  onDeleted,
  onVersionDeleted,
}: {
  readonly noun: DocumentNoun;
  readonly deletable: DocumentDeletable;
  readonly versionCount: number;
  /** The version on screen — what "Delete version <n>" means (rule 9). */
  readonly selected: { readonly id: string; readonly versionNumber: number } | undefined;
  readonly deleteDocument: () => Promise<void>;
  readonly deleteVersion: (versionId: string) => Promise<void>;
  /** The document is gone: the caller leaves the page. */
  readonly onDeleted: () => void;
  /** One version is gone: the caller refetches and picks another. */
  readonly onVersionDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState<null | 'document' | 'version'>(null);

  const removeDocument = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      setConfirm(null);
      onDeleted();
    },
  });
  const removeVersion = useMutation({
    mutationFn: deleteVersion,
    onSuccess: () => {
      setConfirm(null);
      onVersionDeleted();
    },
  });

  const single = versionCount <= 1;
  // Rule 4: with one version there is no version button — deleting it IS deleting the document.
  const versionDeletable =
    !single && selected !== undefined && deletable.versionIds.includes(selected.id);
  const busy = removeDocument.isPending || removeVersion.isPending;
  const active = confirm === 'document' ? removeDocument : removeVersion;

  // Rule 11: nothing to offer. The reason is worth showing; a dead button is not.
  if (!deletable.document && !versionDeletable) {
    return deletable.reason === undefined ? null : (
      <p className="self-center text-xs text-muted-foreground">{deletable.reason}</p>
    );
  }

  /**
   * Just "Delete", and destructive (user, 2026-09-28).
   *
   * It is the only delete on screen wherever it appears — either the document has one version, or
   * the version on screen may not go — so naming the thing adds nothing the page does not already
   * say, and the dialog states exactly what is about to happen either way.
   */
  const deleteDocumentButton = () => (
    <Button
      size="sm"
      type="button"
      variant="destructive"
      disabled={busy}
      onClick={() => setConfirm('document')}
    >
      {removeDocument.isPending ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
      Delete
    </Button>
  );

  /** Destructive too (user, 2026-09-28): every delete on this control reads as one. */
  const deleteVersionButton = () => (
    <Button
      size="sm"
      type="button"
      variant="destructive"
      disabled={busy}
      onClick={() => setConfirm('version')}
    >
      {removeVersion.isPending ? <Spinner className="size-4" /> : <Trash2 className="size-4" />}
      Delete version {selected?.versionNumber}
    </Button>
  );

  return (
    <>
      {/* Rule 8: one version, so the only thing to delete is the document. */}
      {single || !versionDeletable ? (
        deleteDocumentButton()
      ) : deletable.document ? (
        /* Rule 10: both may go — an attached group, the document tucked under the chevron so the
           safer, narrower action stays the one-click default. */
        /* `joined`, not the default: `ButtonGroup`'s default variant is BCDS's semantic grouping,
           which spaces its children with `gap-2`. `joined` is the segmented look — shared borders,
           only the outer corners rounded — which is what "attached" means here. It keys off each
           child's `data-slot`, which both the Button and the dropdown trigger carry. */
        <ButtonGroup
          variant="joined"
          /* No border BETWEEN them (user, 2026-09-28). `joined` drops the second child's LEFT border,
             but the first child keeps its `border border-transparent` right edge — and a TRANSPARENT
             border shows the page through it, so two abutting red blocks were separated by a 1px
             page-coloured line. These buttons draw no visible border anyway, so dropping it entirely
             is what makes the pair read as one element. */
          className="[&>[data-slot]]:border-0"
        >
          {deleteVersionButton()}
          <DropdownMenu>
            {/* Styled directly rather than through `asChild` — this `DropdownMenuTrigger` renders its
                own button and takes no `asChild`, which is how `service-menu.tsx` uses it too. */}
            {/* Styled to match the DESTRUCTIVE Button beside it — same height, same tokens — so the
                joined pair reads as one red control. `asChild` is not an option: this trigger renders
                its own button and does not take it (the same reason `service-menu.tsx` styles it
                inline), so the variant's classes are mirrored rather than reused. */}
            <DropdownMenuTrigger
              aria-label="More delete options"
              disabled={busy}
              className="flex h-8 items-center justify-center rounded-md border border-transparent bg-destructive/10 px-2 text-destructive hover:bg-destructive/20 aria-expanded:bg-destructive/20 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronDown className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            {/* Given a width because the menu otherwise sizes to its trigger — a chevron. `text-sm`
                because a menu item carries no font size of its own and inherited the page's 16px.
                `destructive` to match everything else on this control. */}
            <DropdownMenuContent align="end" className="w-40">
              {/* `onClick`, NOT `onSelect`: this is Base UI's menu, where `onSelect` is Radix's API.
                  It type-checks, reaches the DOM as an unknown prop and is never called — the item
                  looked right and did nothing. `service-menu.tsx` has used `onClick` all along. */}
              <DropdownMenuItem
                variant="destructive"
                className="text-sm whitespace-nowrap"
                onClick={() => setConfirm('document')}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      ) : (
        /* Rule 9: the version may go but the document may not. */
        deleteVersionButton()
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'document'
                ? `Delete this ${noun.full}?`
                : `Delete version ${selected?.versionNumber}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'document'
                ? `This permanently deletes the ${noun.short} and every one of its versions. This can’t be undone.`
                : `This permanently deletes this version. The ${noun.short} and its other versions stay. This can’t be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* The server's own refusal, which is the whole value of a 409 here — it names what is
              standing in the way. */}
          {active.error ? (
            <p role="alert" className="text-sm text-destructive">
              {active.error.message}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                // The dialog stays open on failure so the reason can be read, so the default close
                // is prevented and the mutation drives it.
                event.preventDefault();
                if (confirm === 'document') removeDocument.mutate();
                else if (selected) removeVersion.mutate(selected.id);
              }}
            >
              {confirm === 'document' ? `Delete ${noun.short}` : 'Delete version'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
