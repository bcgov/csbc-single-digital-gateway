import { Handle, useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { FlowContext } from './flow-context';
import { sourceSide } from './flow-handles';
import { DEFAULT_HANDLE } from './flow-elements';
import { useFlowEditor } from './flow-editor';

// A Condition output's source handle, rendered INSIDE the row it belongs to (doc 199 rule 43, amended twice).
//
// The first build spread the handles evenly down the card's edge; the second measured each row's centre and
// offset the handle by it. Both position a handle NEXT TO a row and hope the two stay together — the second was
// still visibly off, because the offset is measured against the card while the handle is placed against the
// node, and the studio frame sits between them.
//
// A handle does not have to be a sibling of the card. `Handle` reads its node from context, so it works anywhere
// in the node's React tree — including inside the row's own `<li>`. Pinned there, the row IS the offset: xyflow
// derives the attachment point from where the row actually rendered, so nothing can drift, nothing is measured,
// and a row that grows a second line takes its handle with it.

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities (doc 196 rule 5).
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * The source handle for one output — a row's, or the Else row's. Renders nothing outside a node: a Condition
 * card drawn on its own (the placement-error path) has no node for a handle to belong to.
 *
 * `-right-4` puts it on the CARD's edge rather than the row's: the row is inset by the list's padding, and a
 * handle floating inside that inset reads as unattached. It is the one thing here still expressed in pixels,
 * and the only one that is purely decorative if it is slightly out.
 */
export function ConditionOutputHandle({ handleId }: { readonly handleId: string }) {
  const flow = useContext(FlowContext);
  const nodeId = useNodeId();
  const editing = useFlowEditor() !== null;
  if (!flow || nodeId === null) return null;

  return (
    <Handle
      id={handleId}
      type="source"
      position={sourceSide(flow.direction)}
      isConnectable={editing}
      // Doc 196 rule 13: the card is pointer-events-none under an editor, so a connectable handle opts back in.
      className={`${editing ? EDIT_HANDLE_CLASS : VIEW_HANDLE_CLASS} nodrag pointer-events-auto -right-4!`}
      data-output={handleId === DEFAULT_HANDLE ? 'default' : 'row'}
    />
  );
}
