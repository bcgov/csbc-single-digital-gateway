import type { ConditionRow, FlowEdge } from '@repo/forms';

/**
 * A Funnel's graph, read PURELY from its uischema (doc 274 rules 1-3) — the readers the studio's `funnel-model.ts`
 * re-exports, here so the Funnel renderer can walk the same graph without importing `studio/`.
 *
 * JSONForms items (`Form`s) live in `elements`; the graph around them lives in `options`: `conditions` (branch points,
 * never JSONForms items), `edges` between node ids and `start`. A Condition item has exactly `@repo/forms`'
 * `ConditionElement` shape and an edge its `FlowEdge` shape. A Condition's DEFAULT path is the edge leaving it with NO
 * `sourceHandle` key.
 */
export type FunnelElement = Record<string, unknown>;

export type FunnelEdge = FlowEdge;

export interface FunnelCondition {
  id: string;
  type: 'Condition';
  label?: string;
  options: { rows: ConditionRow[] };
}

export function isForm(element: unknown): element is FunnelElement {
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

/** An element's own `id` (every studio element carries one), or `undefined`. */
export function nodeIdOf(element: FunnelElement): string | undefined {
  const id = element['id'];
  return typeof id === 'string' && id !== '' ? id : undefined;
}

export function elementsOf(uischema: FunnelElement): unknown[] {
  const elements = uischema['elements'];
  return Array.isArray(elements) ? elements : [];
}

export function optionsOf(uischema: FunnelElement): Record<string, unknown> {
  const options = uischema['options'];
  return isRecord(options) ? options : {};
}

/** The Forms the canvas draws: a `Form` root itself, or a `Funnel`'s `Form` elements. */
export function formsOf(uischema: FunnelElement): FunnelElement[] {
  if (uischema['type'] === 'Form') return [uischema];
  return uischema['type'] === 'Funnel' ? elementsOf(uischema).filter(isForm) : [];
}

export function conditionsOf(uischema: FunnelElement): FunnelCondition[] {
  const conditions = optionsOf(uischema)['conditions'];
  return Array.isArray(conditions) ? conditions.filter(isCondition) : [];
}

/** A Funnel's well-formed edges; malformed entries are dropped and a non-string `sourceHandle` is ignored. */
export function edgesOf(uischema: FunnelElement): FunnelEdge[] {
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
export function nodeIdsOf(uischema: FunnelElement): string[] {
  return [
    ...formsOf(uischema).flatMap((form) => nodeIdOf(form) ?? []),
    ...conditionsOf(uischema).map((c) => c.id),
  ];
}

/** The node a Funnel starts at (`options.start`), or `undefined` for anything else or when unset. */
export function startOf(uischema: FunnelElement): string | undefined {
  const start = optionsOf(uischema)['start'];
  return uischema['type'] === 'Funnel' && typeof start === 'string' ? start : undefined;
}

/**
 * Rule 2: where a Funnel starts — `options.start` when it names a node; else the first node no edge targets (Forms in
 * `elements` order, then Conditions); else the first node. `undefined` only for a Funnel without nodes.
 */
export function startNodeOf(uischema: FunnelElement): string | undefined {
  const nodes = nodeIdsOf(uischema);
  const current = startOf(uischema);
  if (current !== undefined && nodes.includes(current)) return current;
  const targeted = new Set(edgesOf(uischema).map((e) => e.target));
  return nodes.find((id) => !targeted.has(id)) ?? nodes[0];
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

/** Rule 1: the edges a fill walks — exactly the ones the canvas draws. */
export function funnelEdges(uischema: FunnelElement): FunnelEdge[] {
  const names = new Map(nodeIdsOf(uischema).map((id) => [id, id]));
  return drawnEdges(edgesOf(uischema), names, conditionsOf(uischema));
}

/** Rule 3: whether the Funnel ends on a summary page — on unless `options.showSummaryPage` is `false`. */
export const showsSummaryPage = (uischema: FunnelElement): boolean =>
  optionsOf(uischema)['showSummaryPage'] !== false;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
