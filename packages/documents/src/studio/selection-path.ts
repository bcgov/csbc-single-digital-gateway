import { DEFAULT_LABEL } from './criteria';
import type { Uischema } from './document-types';
import { elementName } from '../renderers/studio/element-actions';
import { findById, idOf } from './element-ids';
import {
  conditionsOf,
  edgesOf,
  formsOf,
  nodeIdsOf,
  startOf,
  type FunnelCondition,
  type FunnelEdge,
} from './funnel-model';

/**
 * What a crumb names: the Funnel root, a Form (selectable), a Condition passed through (never selectable), or an
 * element on the focused page — a layout on the way down, or the selected element itself (selectable).
 */
export type SegmentKind = 'funnel' | 'form' | 'condition' | 'element';

/** One crumb of the footer's selection path. */
export interface PathSegment {
  id: string;
  label: string;
  kind: SegmentKind;
}

/** One node on a route, with the edge the route leaves it by (absent on the last). */
interface RouteStep {
  id: string;
  leaving?: FunnelEdge;
}

/**
 * The path to the selected Form (doc 232 rule 6): in a Funnel, the root then every node on the flow's route to the
 * Form — Forms and the Conditions it branches through, each naming the branch taken — ending at the Form; a Form
 * root is the Form alone. `null` when nothing is selected or the id names no Form — the one test of "is something
 * selected", so a Form that was deleted simply stops being selected.
 */
export function selectionPath(uischema: Uischema, selectedId: string | null): PathSegment[] | null {
  if (selectedId === null) return null;
  const forms = formsOf(uischema);
  const selected = forms.find((f) => idOf(f) === selectedId);
  if (selected === undefined) return null;
  if (selected === uischema) return [formSegment(selectedId, selected)];

  const formById = new Map(forms.flatMap((f) => (idOf(f) === undefined ? [] : [[idOf(f)!, f]])));
  const conditionById = new Map(conditionsOf(uischema).map((c) => [c.id, c]));
  const route = routeTo(uischema, selectedId).flatMap(({ id, leaving }): PathSegment[] => {
    const form = formById.get(id);
    if (form !== undefined) return [formSegment(id, form)];
    const condition = conditionById.get(id);
    return condition === undefined ? [] : [conditionSegment(condition, leaving)];
  });
  return [
    { id: idOf(uischema) ?? '', label: labelOf(uischema, 'Funnel'), kind: 'funnel' },
    ...route,
  ];
}

/**
 * The nodes from where the flow reaches `target` to `target` itself: the SHORTEST route from the Funnel's start, ties
 * going to the earlier edge. A node the start never reaches (a floating chain) is routed from the chain's head — the
 * nodes nothing leads into — and one with no route at all is alone.
 */
function routeTo(uischema: Uischema, target: string): RouteStep[] {
  const edges = edgesOf(uischema);
  const start = startOf(uischema);
  const targeted = new Set(edges.map((e) => e.target));
  const heads = nodeIdsOf(uischema).filter((id) => !targeted.has(id));
  return (
    (start === undefined ? undefined : shortestRoute([start], target, edges)) ??
    shortestRoute(heads, target, edges) ?? [{ id: target }]
  );
}

/** A breadth-first route from any of `heads` to `target`, or `undefined` when none reaches it. */
function shortestRoute(
  heads: string[],
  target: string,
  edges: FunnelEdge[],
): RouteStep[] | undefined {
  /** The edge each reached node was first reached by; `null` for a head. */
  const arrival = new Map<string, FunnelEdge | null>(heads.map((h) => [h, null]));
  const queue = [...heads];
  for (let i = 0; i < queue.length && !arrival.has(target); i++) {
    for (const e of edges) {
      if (e.source !== queue[i] || arrival.has(e.target)) continue;
      arrival.set(e.target, e);
      queue.push(e.target);
    }
  }
  if (!arrival.has(target)) return undefined;
  const route: RouteStep[] = [{ id: target }];
  for (let edge = arrival.get(target); edge != null; edge = arrival.get(edge.source)) {
    route.unshift({ id: edge.source, leaving: edge });
  }
  return route;
}

/**
 * A Condition crumb: its name, then in parentheses the branch the route leaves it by — that row's label, or
 * `Default` for the default path (the edge with no `sourceHandle`).
 */
function conditionSegment(
  condition: FunnelCondition,
  leaving: FunnelEdge | undefined,
): PathSegment {
  const handle = leaving?.sourceHandle;
  const branch =
    handle === undefined
      ? DEFAULT_LABEL
      : labelOf(condition.options.rows.find((r) => r.id === handle) ?? {}, 'Branch');
  return {
    id: condition.id,
    label: `${labelOf(condition, 'Untitled condition')} (${branch})`,
    kind: 'condition',
  };
}

function formSegment(id: string, form: Uischema): PathSegment {
  return { id, label: labelOf(form, 'Untitled form'), kind: 'form' };
}

function labelOf(element: { label?: unknown }, fallback: string): string {
  const label = element.label;
  return typeof label === 'string' && label !== '' ? label : fallback;
}

/**
 * The footer path extended into the focused page: after the flow `path` (which must end at the focused Form), every
 * element from the Form's child down to the page selection, each named as the author knows it. The flow path alone
 * when nothing on the page is selected, the page is not the one the path ends at, or the selection is not on it.
 */
export function withPagePath(
  path: PathSegment[] | null,
  variant: Uischema | null,
  schema: Record<string, unknown>,
  focusedId: string | null,
  pageSelectedId: string | null,
): PathSegment[] | null {
  if (path === null || variant === null || focusedId === null || pageSelectedId === null)
    return path;
  if (path.at(-1)?.id !== focusedId) return path;
  const form = findById(variant, focusedId);
  const chain = form === undefined ? undefined : chainTo(form, pageSelectedId);
  if (chain === undefined || chain.length === 0) return path;
  return [
    ...path,
    ...chain.map((element) => ({
      id: idOf(element) ?? '',
      label: elementName(element as never, schema),
      kind: 'element' as const,
    })),
  ];
}

/** The elements below `node` down to (and including) the one with id `id`, outermost first; `undefined` if absent. */
function chainTo(node: Uischema, id: string): Uischema[] | undefined {
  const elements = node['elements'];
  if (!Array.isArray(elements)) return undefined;
  for (const child of elements) {
    if (typeof child !== 'object' || child === null || Array.isArray(child)) continue;
    const element = child as Uischema;
    if (idOf(element) === id) return [element];
    const below = chainTo(element, id);
    if (below !== undefined) return [element, ...below];
  }
  return undefined;
}
