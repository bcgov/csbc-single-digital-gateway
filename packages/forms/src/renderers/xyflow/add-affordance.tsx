import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import type { FlowNodeKind } from './flow-elements';

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

/** The round +'s own size and chrome, shared by the plain button and the menu trigger. */
const ROUND_CLASS =
  'flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:border-ring hover:text-foreground';

/** The edge +'s chrome: a square that slides open to reveal its word on hover and on keyboard focus. */
const ACTION_CLASS =
  'group/add flex h-6 w-6 items-center overflow-hidden rounded-sm border bg-background text-muted-foreground shadow-sm transition-[width] duration-150 hover:w-[4.25rem] hover:border-ring hover:text-foreground focus-visible:w-[4.25rem]';

interface AddNodeMenuProps {
  readonly label: string;
  readonly onAdd: (kind: FlowNodeKind) => void;
  readonly className?: string;
  /** `'round'` is the dangling + under a node or output; `'action'` the one on an edge. */
  readonly variant?: 'round' | 'action';
}

/**
 * Doc 199 rule 24: the + that offers BOTH node kinds. Doc 198 built the leaf and edge + ready for a second
 * action, so pressing one now opens a two-item menu instead of appending a Stage outright.
 *
 * It is a real menu rather than two buttons so the affordance stays one press: `DropdownMenu` gives it keyboard
 * reachability (Enter/Space to open, arrows to move, Escape to close) for free. The origin + of an EMPTY Flow
 * keeps using `AddAffordance`: a Condition with nothing upstream could hold no valid criterion (rule 26).
 */
export function AddNodeMenu({ label, onAdd, className = '', variant = 'round' }: AddNodeMenuProps) {
  const action = variant === 'action';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        data-slot={action ? 'flow-edge-add' : 'flow-add'}
        className={`${CANVAS_BUTTON_CLASS} ${className} ${FOCUS_CLASS} ${action ? ACTION_CLASS : ROUND_CLASS}`}
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          <Icon path={mdiPlus} size="14px" />
        </span>
        {action ? (
          <span className="pr-2 text-xs whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/add:opacity-100 group-focus-visible/add:opacity-100">
            Add
          </span>
        ) : null}
      </DropdownMenuTrigger>
      {/* The menu is portalled out of the canvas, so it needs the pane's gesture opt-outs of its own. */}
      <DropdownMenuContent data-slot="flow-add-menu" className={`w-auto ${CANVAS_BUTTON_CLASS}`}>
        <DropdownMenuItem onClick={() => onAdd('stage')}>Stage</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('condition')}>Condition</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Doc 210 rule 17: one existing node a branch may be connected to. */
export interface ConnectCandidate {
  readonly id: string;
  readonly label: string;
}

interface AddOrConnectMenuProps {
  readonly label: string;
  readonly candidates: readonly ConnectCandidate[];
  readonly onAdd: (kind: FlowNodeKind) => void;
  readonly onConnect: (nodeId: string) => void;
  readonly className?: string;
}

/**
 * Doc 210 rules 16-20: the + on an UNCONNECTED Condition output. It offers a new node of either kind and, below
 * them, every existing node the connection rules permit — because routing a branch into a Stage that already
 * exists is otherwise only reachable by dragging from a handle, the one gesture that is easiest to miss.
 *
 * Rule 19: a refused candidate is OMITTED rather than shown disabled. A disabled row states a refusal without
 * its reason, and the menu has no room for reasons; rule 20: with no candidates the section is absent, not
 * empty. The caller decides what is legal — this component only draws what it is given.
 */
export function AddOrConnectMenu({
  label,
  candidates,
  onAdd,
  onConnect,
  className = '',
}: AddOrConnectMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        data-slot="flow-add"
        className={`${CANVAS_BUTTON_CLASS} ${className} ${FOCUS_CLASS} ${ROUND_CLASS}`}
      >
        <Icon path={mdiPlus} size="14px" />
      </DropdownMenuTrigger>
      {/* The menu is portalled out of the canvas, so it needs the pane's gesture opt-outs of its own. */}
      <DropdownMenuContent data-slot="flow-add-menu" className={`w-auto ${CANVAS_BUTTON_CLASS}`}>
        <DropdownMenuItem onClick={() => onAdd('stage')}>New stage</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd('condition')}>New condition</DropdownMenuItem>
        {candidates.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {/* Base UI requires a group around a menu label — a bare one throws for a missing group context. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Connect to</DropdownMenuLabel>
              {candidates.map((candidate) => (
                <DropdownMenuItem key={candidate.id} onClick={() => onConnect(candidate.id)}>
                  {candidate.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      className={`${CANVAS_BUTTON_CLASS} ${className} ${FOCUS_CLASS} ${ROUND_CLASS}`}
      onClick={onAdd}
    >
      <Icon path={mdiPlus} size="14px" />
    </button>
  );
}

// Doc 198 rule 9's `AddActionButton` is retired: every edge + now opens the Stage|Condition menu (doc 199 rule 24),
// so its chrome lives in `ACTION_CLASS` and `AddNodeMenu`'s `'action'` variant instead.
