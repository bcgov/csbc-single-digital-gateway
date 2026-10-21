import type { AddEdge, AddTarget, DrawnOutput } from './canvas-graph';
import type { FunnelEdge } from './funnel-model';

/** The edges `canvasGraph` draws, built from plain parts. */

/**
 * The edge from an invisible point above a node into it, with a + at its top: red above a headless Condition (the
 * flow is broken), orange above an orphaned Form (it floats).
 */
export function leadingEdge(add: Extract<AddTarget, { nodeId: string }>, name: string): AddEdge {
  const tone = add.kind === 'leading' ? { invalid: true } : { floating: true };
  return {
    id: `leading:${add.nodeId}`,
    type: 'add',
    source: `lead:${add.nodeId}`,
    target: add.nodeId,
    data: { add, sourceName: name, ...tone },
  };
}

/** A drawn output's edge: its persisted edge (a + that splits it), or a trailing edge to `target`, an end node. */
export function toEdge(
  drawn: DrawnOutput,
  target: string,
  persisted: FunnelEdge | undefined,
  sourceName: string,
): AddEdge {
  const { output, handle, branchLabel, isDefault } = drawn;
  return {
    id: persisted?.id ?? `trailing:${output.source}:${handle ?? 'out'}`,
    type: 'add',
    source: output.source,
    ...(handle !== undefined && { sourceHandle: handle }),
    target,
    data: {
      add:
        persisted === undefined
          ? { kind: 'trailing', output }
          : { kind: 'between', edgeId: persisted.id },
      sourceName,
      ...(branchLabel !== undefined && { branchLabel }),
      ...(isDefault === true && { isDefault }),
    },
  };
}
