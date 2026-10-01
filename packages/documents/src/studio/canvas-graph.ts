import type { Edge, Node } from '@xyflow/react';
import { layeredLayout, RANK_HEIGHT } from './canvas-layout';
import { markUnsetBranches, reachableFrom } from './graph-marks';
import { DEFAULT_LABEL, rowSummary } from './criteria';
import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import {
  conditionsOf,
  DEFAULT_HANDLE,
  edgesOf,
  formsOf,
  startOf,
  type FunnelCondition,
  type FunnelEdge,
  type NodeOutput,
} from './funnel-model';
import { upstreamFields } from './upstream-fields';

/** A Form or Condition node's width; the layout works in centres, xyflow in top-left corners. */
export const NODE_WIDTH = 240;
/** How far above the next rank a trailing edge stops. */
const TRAILING_SHORTFALL = 40;

/**
 * How a node is marked. `first`: nothing connects into it, so it draws no input handle. In a Funnel only, `start` (the
 * node `options.start` names) and `end` (on a chain from the start, with no persisted edge leaving it — a floating node
 * or chain is never an end) are badged; `invalid` means it sits downstream of a Condition
 * branch that is not set; `floating` means it is not reachable from the start at all (and wins over `invalid`).
 */
export interface NodeMarks {
  first: boolean;
  start: boolean;
  end: boolean;
  invalid: boolean;
  floating: boolean;
}

export interface FormNodeData extends NodeMarks, Record<string, unknown> {
  formId: string;
  label: string | null;
}

export interface ConditionNodeData extends NodeMarks, Record<string, unknown> {
  conditionId: string;
  label: string | null;
  /** Canvas handle ids of its outputs, left to right: each row's id, then `DEFAULT_HANDLE`. */
  outputs: string[];
}

/** What a + on this edge does: split the persisted edge, or add after the free output the edge trails from. */
export type AddTarget =
  | { kind: 'between'; edgeId: string }
  | { kind: 'trailing'; output: NodeOutput };

export interface AddEdgeData extends Record<string, unknown> {
  add: AddTarget;
  /** Names the + buttons: "after <source>". */
  sourceName: string;
  /** The branch this edge leaves a Condition by, drawn on the edge; `isDefault` for its default path. */
  branchLabel?: string;
  isDefault?: boolean;
  /** Leaves an unset branch, or a node downstream of one. */
  invalid?: boolean;
  /** Leaves a node that is not reachable from the Funnel's start. */
  floating?: boolean;
}

export type FormNode = Node<FormNodeData, 'form'>;
export type ConditionNode = Node<ConditionNodeData, 'condition'>;
export type EndNode = Node<Record<string, never>, 'end'>;
export type CanvasNode = FormNode | ConditionNode | EndNode;
export type AddEdge = Edge<AddEdgeData, 'add'>;

export type CanvasGraph =
  | { kind: 'empty' }
  | { kind: 'graph'; nodes: CanvasNode[]; edges: AddEdge[] }
  | { kind: 'unsupported'; type: unknown };

/** One output of a drawn node, with what the canvas shows for it. */
interface DrawnOutput {
  output: NodeOutput;
  handle?: string;
  branchLabel?: string;
  isDefault?: boolean;
  /** Leaves an unset branch, or a node downstream of one. */
  invalid?: boolean;
  /** Leaves a node that is not reachable from the Funnel's start. */
  floating?: boolean;
}

/**
 * What the canvas draws for a variant's uischema: `empty` for `{}`; `unsupported` for a root other than a `Form` or
 * `Funnel`; otherwise every Form and Condition, the persisted edges between them, and a TRAILING edge (ending at an
 * invisible end node) from every free output — a Form with no outgoing edge, or a Condition row or default with none.
 */
export function canvasGraph(uischema: Uischema, schema: Record<string, unknown> = {}): CanvasGraph {
  if (Object.keys(uischema).length === 0) return { kind: 'empty' };
  if (uischema['type'] !== 'Form' && uischema['type'] !== 'Funnel') {
    return { kind: 'unsupported', type: uischema['type'] };
  }
  const forms = formsOf(uischema).flatMap((form) => (idOf(form) === undefined ? [] : [form]));
  const conditions = conditionsOf(uischema);
  const names = new Map<string, string>([
    ...forms.map((f): [string, string] => [idOf(f)!, labelOf(f) ?? 'Untitled form']),
    ...conditions.map((c): [string, string] => [c.id, c.label ?? 'Untitled condition']),
  ]);
  const edges = drawnEdges(edgesOf(uischema), names, conditions);
  const outputs = new Map<string, DrawnOutput[]>([
    ...forms.map((f): [string, DrawnOutput[]] => [idOf(f)!, [{ output: { source: idOf(f)! } }]]),
    ...conditions.map((c): [string, DrawnOutput[]] => [
      c.id,
      conditionOutputs(c, schema, uischema),
    ]),
  ]);

  const connected = connect(outputs, edges, names);
  const invalid = markUnsetBranches(conditions, connected.edges);
  const funnel = uischema['type'] === 'Funnel';
  const start = startOf(uischema);
  const targeted = new Set(edges.map((e) => e.target));
  const sourced = new Set(edges.map((e) => e.source));
  const reachable = reachableFrom(start, edges);
  const marks = (id: string): NodeMarks => ({
    first: !targeted.has(id),
    start: funnel && id === start,
    end: funnel && reachable.has(id) && !sourced.has(id),
    invalid: invalid.has(id),
    floating: funnel && !reachable.has(id),
  });
  if (funnel) {
    for (const e of connected.edges) if (!reachable.has(e.source) && e.data) e.data.floating = true;
  }
  const slots = layeredLayout([...names.keys(), ...connected.endIds], connected.children);
  const at = (id: string, width: number) => ({
    x: slots.get(id)!.x - width / 2,
    y: slots.get(id)!.rank * RANK_HEIGHT,
  });

  const nodes: CanvasNode[] = [
    ...forms.map((form): FormNode => {
      const formId = idOf(form)!;
      const data = { formId, label: labelOf(form), ...marks(formId) };
      return { id: formId, type: 'form', position: at(formId, NODE_WIDTH), data };
    }),
    ...conditions.map((c) =>
      conditionNode(c, at(c.id, NODE_WIDTH), marks(c.id), outputs.get(c.id)!),
    ),
    ...connected.endIds.map((id): EndNode => {
      const { x, y } = at(id, 1);
      const position = { x, y: y - TRAILING_SHORTFALL };
      return { id, type: 'end', position, data: {}, selectable: false };
    }),
  ];
  return { kind: 'graph', nodes, edges: connected.edges };
}

/**
 * Every drawn output's edge: its persisted edge, or a trailing edge to a new end node. Returns the edges, the end
 * node ids, and each node's children in output order — what the layout fans out.
 */
function connect(
  outputs: ReadonlyMap<string, DrawnOutput[]>,
  edges: FunnelEdge[],
  names: ReadonlyMap<string, string>,
) {
  const drawn: AddEdge[] = [];
  const endIds: string[] = [];
  const children = new Map<string, string[]>();
  for (const [source, list] of outputs) {
    const kids = list.map((output) => {
      const persisted = edges.find(
        (e) => e.source === source && e.sourceHandle === output.output.sourceHandle,
      );
      const target = persisted?.target ?? `end:${source}:${output.handle ?? 'out'}`;
      if (persisted === undefined) endIds.push(target);
      drawn.push(toEdge(output, target, persisted, names.get(source)!));
      return target;
    });
    children.set(source, kids);
  }
  return { edges: drawn, endIds, children };
}

function conditionNode(
  condition: FunnelCondition,
  position: { x: number; y: number },
  marks: NodeMarks,
  outputs: DrawnOutput[],
): ConditionNode {
  return {
    id: condition.id,
    type: 'condition',
    position,
    data: {
      conditionId: condition.id,
      label: condition.label ?? null,
      ...marks,
      outputs: outputs.map((o) => o.handle!),
    },
  };
}

/** A Condition's outputs: each row (drawn with its summary), then the default. */
function conditionOutputs(
  condition: FunnelCondition,
  schema: Record<string, unknown>,
  uischema: Uischema,
) {
  const fields = upstreamFields(schema, uischema, condition.id);
  return [
    ...condition.options.rows.map(
      (row): DrawnOutput => ({
        output: { source: condition.id, sourceHandle: row.id },
        handle: row.id,
        branchLabel: rowSummary(row, fields),
      }),
    ),
    {
      output: { source: condition.id },
      handle: DEFAULT_HANDLE,
      branchLabel: DEFAULT_LABEL,
      isDefault: true,
    },
  ];
}

/**
 * The persisted edges the canvas can draw: both ends are drawn nodes; a Form output carries no handle and a
 * Condition's names one of its rows (or none, for the default); the first edge per output wins.
 */
function drawnEdges(
  edges: FunnelEdge[],
  names: ReadonlyMap<string, string>,
  conditions: FunnelCondition[],
): FunnelEdge[] {
  const rowsOf = new Map(conditions.map((c) => [c.id, new Set(c.options.rows.map((r) => r.id))]));
  const taken = new Set<string>();
  return edges.filter((e) => {
    if (!names.has(e.source) || !names.has(e.target)) return false;
    const rows = rowsOf.get(e.source);
    const valid =
      rows === undefined
        ? e.sourceHandle === undefined
        : e.sourceHandle === undefined || rows.has(e.sourceHandle);
    const key = `${e.source}\u0000${e.sourceHandle ?? ''}`;
    if (!valid || taken.has(key)) return false;
    taken.add(key);
    return true;
  });
}

function toEdge(
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

const labelOf = (form: Uischema): string | null =>
  typeof form['label'] === 'string' ? form['label'] : null;
