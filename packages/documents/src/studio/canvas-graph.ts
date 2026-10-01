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
import { leadingEdge, toEdge } from './graph-edges';
import { upstreamFields } from './upstream-fields';

/** A Form or Condition node's width; the layout works in centres, xyflow in top-left corners. */
export const NODE_WIDTH = 240;
/** How far above the next rank a trailing edge stops. */
const TRAILING_SHORTFALL = 40;
/** How far above a headless Condition (or an orphaned Form) its leading edge starts. */
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

/** What a Form's page renders (doc 236 rule 34): the Form element itself, and the schema its Controls point into. */
export interface FormPage {
  form: Uischema;
  schema: Record<string, unknown>;
}

export interface FormNodeData extends NodeMarks, Record<string, unknown> {
  formId: string;
  label: string | null;
  /** Set by the focus view (doc 233): this Form is drawn as its page, rendering `page`. */
  focused?: boolean;
  /** The page has finished growing: it is now as tall as its content (doc 233 rule 11). */
  open?: boolean;
  /** Back (doc 233): the card again, with its page fading out over it as it shrinks. */
  closing?: boolean;
  page?: FormPage | null;
}

export interface ConditionNodeData extends NodeMarks, Record<string, unknown> {
  conditionId: string;
  label: string | null;
  /** Canvas handle ids of its outputs, left to right: each row's id, then `DEFAULT_HANDLE`. */
  outputs: string[];
}

/** The invisible end node a free output's trailing edge (and its +) leads to. */
export function endIdOf(source: string, handle?: string): string {
  return `end:${source}:${handle ?? 'out'}`;
}

/**
 * What a + on this edge does: split the persisted edge, add after the free output the edge trails from, or add a
 * Form BEFORE a headless Condition (the leading edge above it), or connect into an ORPHANED Form — one nothing leads
 * into that is not the start (doc 235 rule 10b; Connection only).
 */
export type AddTarget =
  | { kind: 'between'; edgeId: string }
  | { kind: 'trailing'; output: NodeOutput }
  | { kind: 'leading'; nodeId: string }
  | { kind: 'orphan'; nodeId: string };

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
  /** Fading out while a Form grows into its page (doc 233): the edge's label and + fade with it. */
  fading?: boolean;
  /** Fading back in after Back (doc 233) — with the flow, or once the page is a card again — label and + with it. */
  appearing?: 'with-flow' | 'after-page';
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
export interface DrawnOutput {
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
  // A Form nothing leads into, other than the start, can only be reached once something connects into it.
  const orphans = started ? [...formIds].filter((id) => !targeted.has(id) && id !== start) : [];
  const leads = new Set([...headless, ...orphans]);
  const marks = (id: string): NodeMarks => ({
    first: !targeted.has(id) && !leads.has(id),
    start: started && id === start,
    end: started && formIds.has(id) && reachable.has(id) && !sourced.has(id),
    invalid: broken || invalid.has(id),
    floating: !broken && funnel && !reachable.has(id),
  });
  const leading = [
    ...headless.map((id) => leadingEdge({ kind: 'leading', nodeId: id }, names.get(id)!)),
    ...orphans.map((id) => leadingEdge({ kind: 'orphan', nodeId: id }, names.get(id)!)),
  ];
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
      const target = persisted?.target ?? endIdOf(source, output.handle);
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

const labelOf = (form: Uischema): string | null =>
  typeof form['label'] === 'string' ? form['label'] : null;
