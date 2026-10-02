import { mdiCogOutline, mdiDeleteOutline, mdiTextBoxEditOutline } from '@mdi/js';
import { ActionBar, ActionBarButton } from '../renderers/studio/action-bar';

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
 * A node's action row (doc 234 rules 1-3, doc 254): the shared action bar just outside the card, below its right edge.
 * Shown while the node (`group/node`) is hovered or focused within, or while it is selected; otherwise transparent and
 * ignoring the pointer, but still named. Its buttons are `nodrag nopan`: a press never drags or pans the canvas.
 */
export function NodeActions({
  name,
  shown = false,
  onEdit,
  onInspect,
  onDelete,
}: NodeActionsProps) {
  return (
    <ActionBar
      slot="document-studio-node-actions"
      label={`${name} actions`}
      shown={shown}
      className={VISIBILITY}
    >
      <ActionBarButton
        label={`Edit ${name}`}
        icon={mdiTextBoxEditOutline}
        className={CANVAS}
        onClick={onEdit}
      />
      {onInspect !== undefined && (
        <ActionBarButton
          label={`Inspect ${name}`}
          icon={mdiCogOutline}
          className={CANVAS}
          onClick={onInspect}
        />
      )}
      <ActionBarButton
        label={`Delete ${name}`}
        icon={mdiDeleteOutline}
        destructive
        className={CANVAS}
        onClick={onDelete}
      />
    </ActionBar>
  );
}

/** A press on a canvas button neither drags the node nor pans the canvas. */
const CANVAS = 'nodrag nopan';

const VISIBILITY =
  'pointer-events-none opacity-0 transition-opacity group-hover/node:pointer-events-auto group-hover/node:opacity-100 group-focus-within/node:pointer-events-auto group-focus-within/node:opacity-100 data-[shown]:pointer-events-auto data-[shown]:opacity-100';
