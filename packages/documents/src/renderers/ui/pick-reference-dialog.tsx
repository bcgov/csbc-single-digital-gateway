import { Button } from '@repo/ui/button';
import { Checkbox } from '@repo/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { useEffect, useId, useState } from 'react';
import { DOCUMENT_TYPE_INFO, type DocumentType } from '../../studio/document-types';
import { toReference, type DocumentReference, type ReferenceCandidate } from './document-reference';
import type { DocumentReferenceSource } from './reference-source';

/** How long typing pauses before the host is asked (rule 7). */
export const PICK_SEARCH_DEBOUNCE_MS = 250;

type Listing =
  | { state: 'loading' }
  | { state: 'ready'; candidates: ReferenceCandidate[] }
  | { state: 'error' };

/** The host's candidates for `q`, asked once typing pauses; a stale answer never replaces a newer one. */
function useCandidates(
  source: DocumentReferenceSource,
  type: DocumentType,
  q: string,
  open: boolean,
): Listing {
  const [listing, setListing] = useState<Listing>({ state: 'loading' });
  useEffect(() => {
    if (!open) return;
    let current = true;
    setListing({ state: 'loading' });
    const timer = setTimeout(() => {
      source.candidates(type, { q: q.trim() }).then(
        (candidates) => current && setListing({ state: 'ready', candidates }),
        (error: unknown) => {
          console.error(`[DocumentReference] listing ${type} candidates failed`, error);
          if (current) setListing({ state: 'error' });
        },
      );
    }, PICK_SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [source, type, q, open]);
  return listing;
}

/**
 * Add existing (rule 7): search the host's documents of `type`, tick any number, Add. What is already referenced is
 * shown ticked and disabled.
 */
export function PickReferenceDialog({
  open,
  onOpenChange,
  source,
  type,
  referenced,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: DocumentReferenceSource;
  type: DocumentType;
  referenced: ReadonlySet<string>;
  onAdd: (references: DocumentReference[]) => void;
}) {
  const id = useId();
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<ReadonlyMap<string, ReferenceCandidate>>(new Map());
  const listing = useCandidates(source, type, q, open);
  const label = DOCUMENT_TYPE_INFO[type].label;
  const toggle = (candidate: ReferenceCandidate, on: boolean) => {
    const next = new Map(chosen);
    if (on) next.set(candidate.id, candidate);
    else next.delete(candidate.id);
    setChosen(next);
  };
  const close = (next: boolean) => {
    if (!next) {
      setQ('');
      setChosen(new Map());
    }
    onOpenChange(next);
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent data-slot="pick-reference-dialog">
        <DialogHeader>
          <DialogTitle>Add {label.toLowerCase()}</DialogTitle>
          <DialogDescription>Choose one or more existing documents to reference.</DialogDescription>
        </DialogHeader>
        <Input
          type="search"
          aria-label="Search"
          placeholder="Search by title"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="max-h-80 overflow-y-auto" aria-live="polite">
          {listing.state === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}
          {listing.state === 'error' && (
            <p role="alert" className="text-sm text-destructive">
              Couldn&apos;t load documents. Try again.
            </p>
          )}
          {listing.state === 'ready' && listing.candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">No documents found</p>
          )}
          {listing.state === 'ready' && listing.candidates.length > 0 && (
            <ul data-slot="pick-reference-list" className="flex flex-col gap-1">
              {listing.candidates.map((candidate) => {
                const already = referenced.has(candidate.id);
                const inputId = `${id}-${candidate.id}`;
                return (
                  <li key={candidate.id} className="flex items-start gap-2 rounded-md p-2">
                    <Checkbox
                      id={inputId}
                      checked={already || chosen.has(candidate.id)}
                      disabled={already}
                      onCheckedChange={(on) => toggle(candidate, on)}
                    />
                    <label htmlFor={inputId} className="flex min-w-0 flex-col text-sm">
                      <span className="font-medium">{candidate.title ?? 'Untitled'}</span>
                      {candidate.description != null && candidate.description !== '' && (
                        <span className="line-clamp-2 text-muted-foreground">
                          {candidate.description}
                        </span>
                      )}
                      {candidate.workspaceName != null && (
                        <span className="text-xs text-muted-foreground">
                          {candidate.workspaceName}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={chosen.size === 0}
            onClick={() => {
              onAdd([...chosen.values()].map(toReference));
              close(false);
            }}
          >
            Add{chosen.size > 0 ? ` (${chosen.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
