import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';

// The shared + affordances of the Flow canvas (doc 198 rules 7, 9, 12, 15). Presentation only — what a press does is
// the caller's business, so these never import the studio or the editor port.

/**
 * Doc 198 rule 15: xyflow pans from a press anywhere on the pane and drags from a press on a node, and a node that is
 * neither selectable nor draggable is given `pointer-events: none` which every child inherits (doc 195 rule 15b). Every
 * + opts out of all three.
 */
export const CANVAS_BUTTON_CLASS = 'nodrag nopan pointer-events-auto';

const FOCUS_CLASS = 'focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none';

interface AddAffordanceProps {
  readonly label: string;
  readonly onAdd: () => void;
  /** Placement classes; the button owns its own size and chrome. */
  readonly className?: string;
}

/**
 * Doc 198 rules 7, 12: the round + that hangs under a leaf Stage and sits at the origin of an empty Flow.
 */
export function AddAffordance({ label, onAdd, className = '' }: AddAffordanceProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-slot="flow-add"
      className={`${CANVAS_BUTTON_CLASS} ${className} ${FOCUS_CLASS} flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:border-ring hover:text-foreground`}
      onClick={onAdd}
    >
      <Icon path={mdiPlus} size="14px" />
    </button>
  );
}

/**
 * Doc 198 rule 9: the square + on an edge, which slides open to reveal "Add" on hover and on keyboard focus. The width
 * is animated rather than the content swapped, so the resting hit area stays exactly square.
 */
export function AddActionButton({ label, onAdd, className = '' }: AddAffordanceProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-slot="flow-edge-add"
      className={`${CANVAS_BUTTON_CLASS} ${className} ${FOCUS_CLASS} group/add flex h-6 w-6 items-center overflow-hidden rounded-sm border bg-background text-muted-foreground shadow-sm transition-[width] duration-150 hover:w-[4.25rem] hover:border-ring hover:text-foreground focus-visible:w-[4.25rem]`}
      onClick={onAdd}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <Icon path={mdiPlus} size="14px" />
      </span>
      <span className="pr-2 text-xs whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/add:opacity-100 group-focus-visible/add:opacity-100">
        Add
      </span>
    </button>
  );
}
