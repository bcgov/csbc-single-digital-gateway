import type { Edge, Node } from '@xyflow/react';
import { layeredLayout, RANK_HEIGHT } from './canvas-layout';
import { markUnsetBranches, reachableFrom } from './graph-marks';
import { DEFAULT_LABEL, rowSummary } from './criteria';
import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import {
  conditionsOf,
  DEFAULT_HANDLE,
  drawnEdges,
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
/** How far above a headless Condition its leading edge starts. */
const LEADING_LENGTH = 40;

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

/**
 * What a + on this edge does: split the persisted edge, add after the free output the edge trails from, or add a
 * Form BEFORE a headless Condition (the leading edge above it — Form only).
 */
export type AddTarget =
  | { kind: 'between'; edgeId: string }
  | { kind: 'trailing'; output: NodeOutput }
  | { kind: 'leading'; nodeId: string };

export interface AddEdgeData extends Record<string, unknown> {
  add: AddTarget;
  /** Names the + buttons: "after <source>" — or, on a leading edge, "before <target>". */
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
/** Where a headless Condition's leading edge starts: an invisible point above it. */
export type LeadNode = Node<Record<string, never>, 'lead'>;
export type CanvasNode = FormNode | ConditionNode | EndNode | LeadNode;
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
  const formIds = new Set(forms.map((f) => idOf(f)!));
  const start = startOf(uischema);
  // Only a Form starts a flow, and a flow with no start has no end either (doc 232 rule 13).
  const started = funnel && start !== undefined && formIds.has(start);
  const targeted = new Set(edges.map((e) => e.target));
  const sourced = new Set(edges.map((e) => e.source));
  const reachable = reachableFrom(start, edges);
  const headless = funnel ? conditions.filter((c) => !targeted.has(c.id)).map((c) => c.id) : [];
  // A Condition nothing leads into has nothing to branch on: the whole flow is in error (rule 14).
  const broken = headless.length > 0;
  const marks = (id: string): NodeMarks => ({
    first: !targeted.has(id) && !headless.includes(id),
    start: started && id === start,
    end: started && formIds.has(id) && reachable.has(id) && !sourced.has(id),
    invalid: broken || invalid.has(id),
    floating: !broken && funnel && !reachable.has(id),
  });
  const leading = headless.map((id) => leadingEdge(id, names.get(id)!));
  for (const e of connected.edges) {
    if (e.data === undefined) continue;
    if (broken) e.data.invalid = true;
    else if (funnel && !reachable.has(e.source)) e.data.floating = true;
  }
  const leadChildren = leading.map((e): [string, string[]] => [e.source, [e.target]]);
  const slots = layeredLayout(
    [...names.keys(), ...connected.endIds, ...leading.map((e) => e.source)],
    new Map([...connected.children, ...leadChildren]),
  );
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
    ...leading.map(({ source, target }): LeadNode => {
      const below = slots.get(target)!;
      const position = { x: below.x, y: below.rank * RANK_HEIGHT - LEADING_LENGTH };
      return { id: source, type: 'lead', position, data: {}, selectable: false };
    }),
  ];
  return { kind: 'graph', nodes, edges: [...connected.edges, ...leading] };
}

/** The red edge from an invisible point above a headless Condition into it, carrying a Form-only + at its top. */
function leadingEdge(conditionId: string, name: string): AddEdge {
  return {
    id: `leading:${conditionId}`,
    type: 'add',
    source: `lead:${conditionId}`,
    target: conditionId,
    data: { add: { kind: 'leading', nodeId: conditionId }, sourceName: name, invalid: true },
  };
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
