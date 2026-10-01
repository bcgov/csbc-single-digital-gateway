import { mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Handle, Position } from '@xyflow/react';
import type { ReactNode } from 'react';
import type { NodeMarks } from './canvas-graph';
import { useCanvasActions } from './canvas-actions';
import { MOTION } from './canvas-zoom';

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
 * A node's card, marked in a Funnel by the colour of its 2px border: orange when not reachable from the start, red when downstream
 * of an unset branch, else green for the start,
 * black for an end, and split — green on the left, black on the right — for a node that is both. Start / End badges
 * sit above its left and right corners at the same inset, raised clear of the delete button on the corner.
 */
export function NodeFrame({
  marks,
  selected = false,
  page,
  slot,
  className,
  children,
}: {
  marks: NodeMarks;
  /** The studio's selection (doc 232): an offset ring OUTSIDE the border, so it never merges with a state mark. */
  selected?: boolean;
  /**
   * Drawn as a focused Form's page (doc 233): `growing` while the card grows to the page's first screen (a fixed
   * 994px, so the camera fits a known size), then `open` — as tall as its content, never shorter. A card that can
   * become a page has a fixed height (Form cards are `h-14`); `interpolate-size` lets height animate to and from
   * `auto` (Chromium; elsewhere those steps jump).
   */
  page?: 'growing' | 'open' | undefined;
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
      data-selected={selected || undefined}
      className={`relative ${page === undefined ? 'w-60' : PAGE_SIZE[page]} transition-[width,height] [interpolate-size:allow-keywords] ${MOTION} rounded-md border-2 bg-background shadow-xs ${borderOf(marks)} ${selected ? SELECTED_CLASS : ''} ${className}`}
    >
      {split && (
        <>
          <span
            aria-hidden
            className={`${HALF_CLASS} -left-0.5 right-1/2 rounded-l-md border-r-0 border-success-border`}
          />
          <span
            aria-hidden
            className={`${HALF_CLASS} -right-0.5 left-1/2 rounded-r-md border-l-0 border-foreground`}
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

/**
 * The border's colour. Its width is always 2px, so a mark appearing never shifts the card. A split start-and-end
 * border keeps the neutral colour underneath the two half frames that cover it.
 */
function borderOf({ floating, invalid, start, end }: NodeMarks): string {
  if (floating) return 'border-warning-border';
  if (invalid) return 'border-danger-border';
  if (start && end) return 'border-border';
  if (start) return 'border-success-border';
  return end ? 'border-foreground' : 'border-border';
}

/** A page's size: `PAGE_WIDTH` × `PAGE_HEIGHT` (focus-view.ts), then its content's height; literal for Tailwind. */
const PAGE_SIZE = {
  growing: 'w-[768px] h-[994px]',
  open: 'w-[768px] h-auto min-h-[994px]',
} as const;

/** The selection ring, offset so a background-coloured gap separates it from a coloured border. */
const SELECTED_CLASS = 'ring-2 ring-ring ring-offset-2 ring-offset-background';

/**
 * One half of a split border: a 2px frame laid exactly over the card's own border. Absolute insets measure from the
 * padding box, so `-0.5` (2px) reaches the border's outer edge.
 */
const HALF_CLASS = 'pointer-events-none absolute -inset-y-0.5 border-2';

/** `mb-3` keeps the badge's bottom above the delete button, which overhangs the corner by 10px. */
const BADGE_CLASS =
  'absolute bottom-full mb-3 rounded-sm px-1.5 py-px text-[10px] font-medium text-background';
