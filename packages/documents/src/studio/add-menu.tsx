import { mdiPlus, mdiRhombusOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import type { CSSProperties, MouseEvent } from 'react';
import type { NodeKind } from './node-edits';

/**
 * The + on an edge: a round + that slides open from its centre, on hover or keyboard focus, into two actions —
 * `+ Form` and `◇ Condition`. Both are always in the DOM (clipped while closed), so Tab reaches them and opens it.
 * `nodrag nopan` because xyflow pans from any press on the pane.
 */
export function AddMenu({
  sourceName,
  onAdd,
  style,
}: {
  sourceName: string;
  onAdd: (kind: NodeKind) => void;
  style: CSSProperties;
}) {
  // Focus would otherwise stay inside the pill after a pointer press, holding it open over the new node.
  const choose = (event: MouseEvent<HTMLButtonElement>, kind: NodeKind) => {
    event.currentTarget.blur();
    onAdd(kind);
  };
  return (
    <div
      role="group"
      aria-label={`Add after ${sourceName}`}
      data-slot="document-studio-add-menu"
      style={style}
      className="group/add nodrag nopan pointer-events-auto absolute flex h-6 w-6 items-center overflow-hidden rounded-full border border-border bg-background text-muted-foreground shadow-xs transition-[width] duration-150 focus-within:w-[9.375rem] focus-within:border-ring hover:w-[9.375rem] hover:border-ring"
    >
      <button
        type="button"
        aria-label={`Add form after ${sourceName}`}
        className={`${ACTION_CLASS} pr-2`}
        onClick={(event) => choose(event, 'form')}
      >
        {/* 22px, not 24: the border insets the content, and a 24px box would push the + off centre. */}
        <span className="flex size-[22px] shrink-0 items-center justify-center">
          <Icon path={mdiPlus} size="14px" />
        </span>
        <span className={LABEL_CLASS}>Form</span>
      </button>
      <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />
      <button
        type="button"
        aria-label={`Add condition after ${sourceName}`}
        className={`${ACTION_CLASS} gap-1 px-2`}
        onClick={(event) => choose(event, 'condition')}
      >
        <Icon path={mdiRhombusOutline} size="12px" className="shrink-0" />
        <span className={LABEL_CLASS}>Condition</span>
      </button>
    </div>
  );
}

const ACTION_CLASS =
  'flex h-full shrink-0 items-center rounded-full whitespace-nowrap hover:text-foreground focus-visible:text-foreground focus-visible:outline-none';
const LABEL_CLASS =
  'text-xs opacity-0 transition-opacity duration-150 group-focus-within/add:opacity-100 group-hover/add:opacity-100';
