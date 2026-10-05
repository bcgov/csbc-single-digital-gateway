import { toast } from '@repo/ui/sonner';
import { LOCKED } from '../capabilities/governance';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

/** How long a first click waits for a second before it copies (doc 257 rule 5). */
export const DOUBLE_CLICK_WINDOW_MS = 250;

export interface InspectorHeaderProps {
  /** The kind's display name, on the left (rule 1). */
  kind: string;
  /** The bound property's key and how many fields share it; absent: the kind alone (rule 1). */
  property?: { key: string; shared: number } | undefined;
  /** Why a new key is refused, or `undefined` (rule 10). */
  problem: (next: string) => string | undefined;
  /** A valid, changed key (rule 12). */
  onRename: (next: string) => void;
  /** The pinned template locks the Data key (doc 259 rule 16): it still copies, but never opens for editing. */
  renameLocked?: boolean;
}

/**
 * The inspector's header (doc 257 rules 1-4): the kind, then — for a bound Control — a "Data key" row with its property
 * key as a code chip on the right (click copies, double click renames inline), any rename error and the shared note.
 */
export function InspectorHeader({
  kind,
  property,
  problem,
  onRename,
  renameLocked = false,
}: InspectorHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const errorId = useId();
  const close = () => {
    setEditing(false);
    setError(undefined);
  };
  return (
    <div className="flex flex-col gap-1">
      <div data-slot="inspector-header">
        <span data-slot="inspector-kind" className="text-xs font-medium">
          {kind}
        </span>
      </div>
      {property !== undefined && (
        <div
          data-slot="inspector-data-key"
          className="flex min-h-7 min-w-0 items-center justify-between gap-2"
        >
          <span className="shrink-0 text-xs">Data key</span>
          {editing ? (
            <KeyInput
              value={property.key}
              error={error}
              errorId={errorId}
              onCommit={(next, fromEnter) => {
                const found = problem(next);
                if (found !== undefined && next !== property.key && fromEnter) {
                  setError(found);
                  return false;
                }
                if (found === undefined && next !== property.key) onRename(next);
                close();
                return true;
              }}
              onCancel={close}
            />
          ) : (
            <KeyChip
              value={property.key}
              {...(!renameLocked && { onEdit: () => setEditing(true) })}
            />
          )}
        </div>
      )}
      {editing && error !== undefined && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {property !== undefined && property.shared > 1 && (
        <p data-slot="inspector-shared" className="text-xs text-muted-foreground">
          Shared by {property.shared} fields
        </p>
      )}
    </div>
  );
}

/** Rules 3 and 5-7: the key as code; a click copies once the double-click window passes, a double click edits. */
function KeyChip({ value, onEdit }: { value: string; onEdit?: (() => void) | undefined }) {
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(pending.current), []);
  const copy = () => copyKey(value);
  const onClick = (event: MouseEvent) => {
    clearTimeout(pending.current);
    // `detail` 0 is a keyboard / assistive activation: no double click can follow, so copy at once (rule 7).
    if (event.detail === 0) return copy();
    if (event.detail === 1) pending.current = setTimeout(copy, DOUBLE_CLICK_WINDOW_MS);
  };
  return (
    <button
      type="button"
      data-slot="property-key"
      aria-label={`Data key ${value}`}
      title={
        onEdit === undefined
          ? `${value} — click to copy. ${LOCKED}.`
          : `${value} — click to copy, double-click to rename`
      }
      className="min-w-0 cursor-pointer truncate rounded bg-muted px-1 font-mono text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={onClick}
      onDoubleClick={() => {
        clearTimeout(pending.current);
        // Locked: a double click is just a (single) copy.
        if (onEdit === undefined) copy();
        else onEdit();
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key !== 'F2' || onEdit === undefined) return;
        event.preventDefault();
        clearTimeout(pending.current);
        onEdit();
      }}
    >
      {value}
    </button>
  );
}

/** Writes the key to the clipboard and says how it went in a toast (rule 6). */
function copyKey(value: string): void {
  const write = navigator.clipboard?.writeText(value) ?? Promise.reject(new Error('No clipboard'));
  write.then(
    () => toast.success('ID copied to clipboard', { description: value }),
    (error: unknown) => {
      console.error(`[document-studio] Could not copy property key "${value}"`, error);
      toast.error("Couldn't copy the ID", { description: value });
    },
  );
}

/** Rules 8-11: the key edited in place — Enter or blur commits, Escape cancels without reaching the canvas. */
function KeyInput({
  value,
  error,
  errorId,
  onCommit,
  onCancel,
}: {
  value: string;
  error: string | undefined;
  errorId: string;
  /** Whether the editor closed: an invalid Enter keeps it open (rule 11). */
  onCommit: (next: string, fromEnter: boolean) => boolean;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);
  // Set once Escape or a successful Enter has decided: the blur that unmounting may fire must not commit again.
  const settled = useRef(false);
  useLayoutEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <input
      ref={input}
      aria-label="Data key"
      aria-invalid={error !== undefined || undefined}
      aria-describedby={error === undefined ? undefined : errorId}
      spellCheck={false}
      value={draft}
      className="h-5 min-w-0 flex-1 rounded bg-muted px-1 text-right font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:ring-2 aria-invalid:ring-destructive"
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          settled.current = onCommit(draft.trim(), true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          settled.current = true;
          onCancel();
        }
      }}
      onBlur={() => {
        if (!settled.current) onCommit(draft.trim(), false);
      }}
    />
  );
}
