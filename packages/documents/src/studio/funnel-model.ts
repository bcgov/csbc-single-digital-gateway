import type { ConditionRow, FlowEdge } from '@repo/forms';
import type { DocumentContent, Uischema } from './document-types';
import { idOf } from './element-ids';

/**
 * What a variant's root holds. JSONForms items (`Form`s) live in `elements`; the graph around them lives in
 * `options`: `conditions` (branch points, never JSONForms items) and `edges` between node ids. A Condition item has
 * exactly `@repo/forms`' `ConditionElement` shape, and an edge its `FlowEdge` shape, so that package's runner can
 * route a Funnel later. A Condition's DEFAULT path is the edge leaving it with NO `sourceHandle` key. `options.start`
 * names the node a Funnel starts at.
 */
export type FunnelEdge = FlowEdge;

export interface FunnelCondition {
  id: string;
  type: 'Condition';
  label?: string;
  options: { rows: ConditionRow[] };
}

/** One output of a node: a Form's only output, a Condition row (`sourceHandle`), or a Condition's default. */
export interface NodeOutput {
  source: string;
  sourceHandle?: string;
}

/** The canvas handle id of a Condition's default output. Never written to an edge — the default has no handle. */
export const DEFAULT_HANDLE = 'default';

export function isForm(element: unknown): element is Uischema {
  return isRecord(element) && element['type'] === 'Form';
}

export function isCondition(value: unknown): value is FunnelCondition {
  return (
    isRecord(value) &&
    value['type'] === 'Condition' &&
    typeof value['id'] === 'string' &&
    isRecord(value['options']) &&
    Array.isArray(value['options']['rows'])
  );
}

export function elementsOf(uischema: Uischema): unknown[] {
  const elements = uischema['elements'];
  return Array.isArray(elements) ? elements : [];
}

export function optionsOf(uischema: Uischema): Record<string, unknown> {
  const options = uischema['options'];
  return isRecord(options) ? options : {};
}

/** The Forms the canvas draws: a `Form` root itself, or a `Funnel`'s `Form` elements. */
export function formsOf(uischema: Uischema): Uischema[] {
  if (uischema['type'] === 'Form') return [uischema];
  return uischema['type'] === 'Funnel' ? elementsOf(uischema).filter(isForm) : [];
}

export function conditionsOf(uischema: Uischema): FunnelCondition[] {
  const conditions = optionsOf(uischema)['conditions'];
  return Array.isArray(conditions) ? conditions.filter(isCondition) : [];
}

/** A Funnel's well-formed edges; malformed entries are dropped and a non-string `sourceHandle` is ignored. */
export function edgesOf(uischema: Uischema): FunnelEdge[] {
  const edges = optionsOf(uischema)['edges'];
  if (!Array.isArray(edges)) return [];
  return edges.flatMap((e: unknown): FunnelEdge[] => {
    if (!isRecord(e)) return [];
    const { id, source, target, sourceHandle } = e;
    if (typeof id !== 'string' || typeof source !== 'string' || typeof target !== 'string')
      return [];
    return [{ id, source, target, ...(typeof sourceHandle === 'string' && { sourceHandle }) }];
  });
}

/** Every node id a Funnel draws: its Forms, then its Conditions. */
export function nodeIdsOf(uischema: Uischema): string[] {
  return [
    ...formsOf(uischema).flatMap((form) => idOf(form) ?? []),
    ...conditionsOf(uischema).map((c) => c.id),
  ];
}

/** Whether `edge` leaves `output` — the same node AND the same handle (both absent for a default/Form output). */
export const leaves = (edge: FunnelEdge, output: NodeOutput): boolean =>
  edge.source === output.source && edge.sourceHandle === output.sourceHandle;

/** The output an edge leaves by, in the shape an edge stores it. */
export const outputOf = (edge: FunnelEdge): NodeOutput => ({
  source: edge.source,
  ...(edge.sourceHandle !== undefined && { sourceHandle: edge.sourceHandle }),
});

/** A Funnel with any of its parts replaced; everything else, including other options, is kept. */
export function withFunnel(
  uischema: Uischema,
  parts: { elements?: unknown[]; conditions?: FunnelCondition[]; edges?: FunnelEdge[] },
): Uischema {
  const { elements, ...options } = parts;
  return {
    ...uischema,
    ...(elements !== undefined && { elements }),
    options: { ...optionsOf(uischema), ...options },
  };
}

/** The node a Funnel starts at (`options.start`), or `undefined` for anything else or when unset. */
export function startOf(uischema: Uischema): string | undefined {
  const start = optionsOf(uischema)['start'];
  return uischema['type'] === 'Funnel' && typeof start === 'string' ? start : undefined;
}

/** A Funnel starting at `start`; `undefined` removes the key rather than writing it. */
export function withStart(uischema: Uischema, start: string | undefined): Uischema {
  const { start: _previous, ...options } = optionsOf(uischema);
  return { ...uischema, options: start === undefined ? options : { ...options, start } };
}

/**
 * A Funnel whose `options.start` names one of its nodes. One saved before starts existed (or naming a deleted node)
 * starts at its first node nothing leads into — Forms in `elements` order, then Conditions. The same object when
 * nothing changes, so opening a document with a valid start is not an edit.
 */
export function ensureStart(uischema: Uischema): Uischema {
  if (uischema['type'] !== 'Funnel') return uischema;
  const nodes = nodeIdsOf(uischema);
  const current = startOf(uischema);
  if (current !== undefined && nodes.includes(current)) return uischema;
  const targeted = new Set(edgesOf(uischema).map((e) => e.target));
  const start = nodes.find((id) => !targeted.has(id)) ?? nodes[0];
  return start === current ? uischema : withStart(uischema, start);
}

/** `content` with every variant's start ensured; the same object when nothing changed. */
export function ensureContentStart(content: DocumentContent): DocumentContent {
  const entries = Object.entries(content.variants).map(
    ([name, v]) => [name, ensureStart(v)] as const,
  );
  if (entries.every(([name, v]) => v === content.variants[name])) return content;
  return { ...content, variants: Object.fromEntries(entries) as DocumentContent['variants'] };
}

/**
 * The persisted edges the canvas can draw: both ends are drawn nodes; a Form output carries no handle and a
 * Condition's names one of its rows (or none, for the default); the first edge per output wins.
 */
export function drawnEdges(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
