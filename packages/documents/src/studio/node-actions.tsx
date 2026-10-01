import { mdiCogOutline, mdiDeleteOutline, mdiTextBoxEditOutline } from '@mdi/js';
import { Icon } from '@mdi/react';

interface NodeActionsProps {
  /** The node's name, as the buttons say it ("Edit Details"). */
  name: string;
  /** Shown without hover — the node is selected (doc 234 rule 2). */
  shown?: boolean;
  onEdit: () => void;
  /** Absent for a Condition, which has nothing to inspect yet. */
  onInspect?: (() => void) | undefined;
  onDelete: () => void;
}

/**
 * A node's action row (doc 234 rules 1-3): square icon buttons just outside the card, below its right edge. Shown while
 * the node (`group/node`) is hovered or focused within, or while it is selected; otherwise transparent and ignoring
 * the pointer, but still named. The top padding bridges the gap, so the pointer never leaves the node on its way down.
 */
export function NodeActions({
  name,
  shown = false,
  onEdit,
  onInspect,
  onDelete,
}: NodeActionsProps) {
  return (
    <div
      data-slot="document-studio-node-actions"
      data-shown={shown || undefined}
      className={`absolute top-full right-0 flex gap-0.5 pt-0.5 ${VISIBILITY}`}
    >
      <ActionButton label={`Edit ${name}`} icon={mdiTextBoxEditOutline} onClick={onEdit} />
      {onInspect !== undefined && (
        <ActionButton label={`Inspect ${name}`} icon={mdiCogOutline} onClick={onInspect} />
      )}
      <ActionButton
        label={`Delete ${name}`}
        icon={mdiDeleteOutline}
        onClick={onDelete}
        className="hover:text-destructive"
      />
    </div>
  );
}

const VISIBILITY =
  'pointer-events-none opacity-0 transition-opacity group-hover/node:pointer-events-auto group-hover/node:opacity-100 group-focus-within/node:pointer-events-auto group-focus-within/node:opacity-100 data-[shown]:pointer-events-auto data-[shown]:opacity-100';

function ActionButton({
  label,
  icon,
  onClick,
  className = 'hover:text-foreground',
}: {
  label: string;
  icon: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`nodrag nopan flex size-4 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground shadow-xs ${className}`}
      onClick={onClick}
    >
      <Icon path={icon} size="12px" />
    </button>
  );
}
