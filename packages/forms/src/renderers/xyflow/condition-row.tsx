import { mdiAlertOutline, mdiDragVertical } from '@mdi/js';
import type React from 'react';
import { useContext, useMemo } from 'react';
import { useNodeId } from '@xyflow/react';
import { Icon } from '@mdi/react';
import { Popover, PopoverTrigger } from '@repo/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip';
import type { ConditionRow as Row } from '../../types/elements';
import { AddOrConnectMenu, type ConnectCandidate } from './add-affordance';
import { useConditionHover } from './condition-hover';
import { FlowContext } from './flow-context';
import { ConditionOutputHandle } from './condition-output-handle';
import { ConditionRowPopover } from './condition-row-popover';
import { rowProblems, rowSummary, rowTitle } from './condition-rows';
import { decisionFieldHint, type CriterionField } from './criteria';
import { ROW_CONTROL_CLASS } from './criterion-controls';
import { DEFAULT_HANDLE, drawnNodes, nodeLabel } from './flow-elements';
import type { FlowEditor } from './flow-editor';

// One row of the Condition card (doc 199 rules 43-44), split out of `condition-renderer` to keep both files
// well under the 300-line gate.

/**
 * Doc 199 rule 34: a gold icon in the row whose tooltip says the field may be left blank. An icon, not a line of
 * text: the canvas spaces ranks a FIXED distance apart (doc 198), so a taller card collides with the nodes below
 * it. The icon's accessible name is the whole hint, so it never depends on the tooltip being seen.
 */
function OptionalFieldHint({ field }: { readonly field: CriterionField | undefined }) {
  if (field === undefined) return null;
  const hint = decisionFieldHint(field.label);
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={hint}
        data-slot="condition-optional-field-hint"
        className={`${ROW_CONTROL_CLASS} shrink-0 rounded-sm text-bcgov-gold`}
      >
        <Icon path={mdiAlertOutline} size="14px" />
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Rule 20, widened by doc 210 rules 16-21: the + on an unconnected output. It wires the branch to a NEW node of
 * either kind, or to an existing one — and it is only ever on screen for an output that leads nowhere, so
 * "where does this branch go?" is exactly the question it answers.
 *
 * Which existing nodes are offered is decided by `connectionProblem`, the same judge the drag and the code
 * panel use (doc 209 rule 14), so the menu can never offer an edge the document would refuse.
 */
export function OutputAdd({
  editor,
  conditionId,
  handle,
}: {
  readonly editor: FlowEditor;
  readonly conditionId: string;
  readonly handle: string;
}) {
  const flow = useContext(FlowContext);
  // The xyflow node id IS the Condition's authored id (doc 195 rule 10), which is what an edge addresses.
  const nodeId = useNodeId();
  // The Else output leaves by no row, so its edge carries no handle (doc 199 rules 18, 37).
  const sourceHandle = handle === DEFAULT_HANDLE ? undefined : handle;
  const flowElement = flow?.element;
  const candidates = useMemo<ConnectCandidate[]>(() => {
    if (!flowElement || nodeId === null) return [];
    return drawnNodes(flowElement).flatMap((node) =>
      node.authored &&
      editor.connectionProblem(flowElement, nodeId, node.id, sourceHandle) === undefined
        ? [{ id: node.id, label: nodeLabel(node.element) }]
        : [],
    );
  }, [flowElement, nodeId, sourceHandle, editor]);

  const flowId = flow?.id;
  return (
    <AddOrConnectMenu
      label="Add a node"
      className="shrink-0"
      candidates={flowId === undefined || nodeId === null ? [] : candidates}
      onAdd={(kind) =>
        editor.onGesture(
          sourceHandle === undefined
            ? { type: 'append', stageId: conditionId, kind }
            : { type: 'append', stageId: conditionId, kind, sourceHandle },
        )
      }
      onConnect={(target) => {
        if (flowId === undefined || nodeId === null) return;
        editor.onGesture(
          sourceHandle === undefined
            ? { type: 'connect', flowId, source: nodeId, target }
            : { type: 'connect', flowId, source: nodeId, target, sourceHandle },
        );
      }}
    />
  );
}

interface RowProps {
  readonly row: Row;
  readonly fields: readonly CriterionField[];
  readonly editor: FlowEditor | null;
  readonly conditionId: string | null;
  readonly nodeId: string;
  readonly hint: CriterionField | undefined;
  readonly wired: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Rule 49: this row's place in the list, and where a drop on it should move the dragged row to. */
  readonly index: number;
  readonly onReorder: (rowId: string, toIndex: number) => void;
}

/**
 * Rules 43-44: one row — grip, label, summary, handle-side affordances. Hovering it highlights the row and, via
 * `ConditionHoverContext`, its handle and its edge; pressing it opens the popover under an editor (rule 47).
 */
export function ConditionRow({
  row,
  fields,
  editor,
  conditionId,
  nodeId,
  hint,
  wired,
  open,
  onOpenChange,
  index,
  onReorder,
}: RowProps) {
  const hover = useConditionHover();
  const invalid = editor !== null && rowProblems(row, fields).length > 0;
  // Rule 49: native HTML drag-and-drop rather than a library — a row moves within one short list, and xyflow
  // already owns pointer drags on the canvas, so `nodrag` plus the native API keeps the two from fighting.
  // jsdom cannot perform a real drag, so the REORDER is tested through `moveRow`; this half is verified by hand.
  const drop = (event: React.DragEvent) => {
    event.preventDefault();
    const dragged = event.dataTransfer.getData('text/condition-row');
    if (dragged !== '' && dragged !== row.id) onReorder(dragged, index);
  };
  const body = (
    <>
      {editor ? (
        <Icon
          path={mdiDragVertical}
          size="14px"
          data-slot="condition-row-grip"
          className="shrink-0 text-muted-foreground"
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span data-slot="condition-row-label" className="truncate text-xs font-medium">
          {rowTitle(row, fields)}
        </span>
        <span
          data-slot="condition-row-summary"
          className={`truncate font-mono text-[10px] ${invalid ? 'text-warning-text' : 'text-muted-foreground'}`}
        >
          {invalid ? '⚠ ' : ''}
          {rowSummary(row, fields)}
        </span>
      </span>
    </>
  );

  return (
    <li
      data-slot="condition-criterion-row"
      data-invalid={invalid ? '' : undefined}
      draggable={editor !== null}
      onDragStart={(event) => event.dataTransfer.setData('text/condition-row', row.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
      onPointerEnter={() => hover.setHovered(nodeId, row.id)}
      onPointerLeave={() => hover.setHovered(null, null)}
      // `relative` is what pins the output handle to THIS row (doc 199 rule 43): xyflow positions a handle
      // against its nearest positioned ancestor, so without it every row's handle would stack on the node.
      className={`relative flex items-center gap-1.5 rounded-md px-2 py-1.5 ${
        open ? 'bg-accent shadow-[inset_2px_0_0_var(--color-primary)]' : 'hover:bg-accent'
      }`}
    >
      {editor && conditionId !== null ? (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger
            data-slot="condition-row-open"
            className={`${ROW_CONTROL_CLASS} flex min-w-0 flex-1 items-center gap-1.5`}
          >
            {body}
          </PopoverTrigger>
          <ConditionRowPopover
            row={row}
            fields={fields}
            editor={editor}
            conditionId={conditionId}
            onDone={() => onOpenChange(false)}
          />
        </Popover>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-1.5">{body}</span>
      )}
      <OptionalFieldHint field={hint} />
      {/* Rule 43: the branch's output, pinned to its own row rather than offset down the card's edge. */}
      <ConditionOutputHandle handleId={row.id} />
      {editor && conditionId !== null && !wired ? (
        <OutputAdd editor={editor} conditionId={conditionId} handle={row.id} />
      ) : null}
    </li>
  );
}
