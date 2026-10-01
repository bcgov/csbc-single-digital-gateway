import { mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import type { NodeMarks } from './canvas-graph';
import { useCanvasActions } from './canvas-actions';

/** xyflow's stylesheet is unlayered and beats Tailwind's layered utilities, hence the important modifier. */
export const HIDDEN_HANDLE = 'opacity-0!';

/** A node's incoming handle, drawn only when something connects into it. */
export function InputHandle({ show }: { show: boolean }) {
  return show ? (
    <Handle type="target" position={Position.Top} isConnectable={false} className={HIDDEN_HANDLE} />
  ) : null;
}

/** The round delete button on a node's top-right corner. */
export function NodeDeleteButton({ nodeId, name }: { nodeId: string; name: string }) {
  const { remove } = useCanvasActions();
  return (
    <button
      type="button"
      aria-label={`Delete ${name}`}
      data-slot="document-studio-delete-node"
      className="nodrag nopan absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-xs hover:text-destructive"
      onClick={() => remove(nodeId)}
    >
      <Icon path={mdiDeleteOutline} size="12px" />
    </button>
  );
}

/**
 * A node's card, marked in a Funnel by a 2px outline: orange when not reachable from the start, red when downstream
 * of an unset branch, else green for the start,
 * black for an end, and split — green on the left, black on the right — for a node that is both. Start / End badges
 * sit above its left and right corners at the same inset, raised clear of the delete button on the corner.
 */
export function NodeFrame({
  marks,
  slot,
  className,
  children,
}: {
  marks: NodeMarks;
  slot: string;
  className: string;
  children: ReactNode;
}) {
  const split = !marks.invalid && !marks.floating && marks.start && marks.end;
  return (
    <div
      data-slot={slot}
      data-start={marks.start || undefined}
      data-end={marks.end || undefined}
      data-invalid={marks.invalid || undefined}
      data-floating={marks.floating || undefined}
      className={`relative w-60 rounded-md border border-border bg-background shadow-xs ${outlineOf(marks)} ${className}`}
    >
      {split && (
        <>
          <span
            aria-hidden
            className={`${HALF_CLASS} -left-0.5 right-1/2 rounded-l-[8px] border-r-0 border-success-border`}
          />
          <span
            aria-hidden
            className={`${HALF_CLASS} -right-0.5 left-1/2 rounded-r-[8px] border-l-0 border-foreground`}
          />
        </>
      )}
      {marks.start && (
        <span
          className={`${BADGE_CLASS} left-0 bg-success-border`}
          data-slot="document-studio-start-badge"
        >
          Start
        </span>
      )}
      {marks.end && (
        <span
          className={`${BADGE_CLASS} right-0 bg-foreground`}
          data-slot="document-studio-end-badge"
        >
          End
        </span>
      )}
      {children}
    </div>
  );
}

/** The single-colour outline; a split one is drawn by two half frames instead, since an outline has one colour. */
function outlineOf({ floating, invalid, start, end }: NodeMarks): string {
  if (floating) return 'outline-2 outline-warning-border';
  if (invalid) return 'outline-2 outline-danger-border';
  if (start && end) return '';
  if (start) return 'outline-2 outline-success-border';
  return end ? 'outline-2 outline-foreground' : '';
}

/** One half of a split outline: a 2px frame just outside the card's border, where an outline would draw. */
const HALF_CLASS = 'pointer-events-none absolute -inset-y-0.5 border-2';

/** `mb-3` keeps the badge's bottom above the delete button, which overhangs the corner by 10px. */
const BADGE_CLASS =
  'absolute bottom-full mb-3 rounded-sm px-1.5 py-px text-[10px] font-medium text-background';
