import { conditionEdge, type FunnelData } from './clause-match';
import {
  conditionsOf,
  formsOf,
  funnelEdges,
  nodeIdOf,
  showsSummaryPage,
  startNodeOf,
  type FunnelCondition,
  type FunnelEdge,
  type FunnelElement,
} from './funnel-graph';

// Where a Funnel's fill starts and goes next (doc 274 rules 8-10, 13). PURE. Positions are Form ids: a Funnel has no
// Stages, so a Form is a whole step.

/** The document and answers every routing question is asked against. */
export interface FunnelContext {
  readonly funnel: FunnelElement;
  readonly schema: Record<string, unknown>;
  readonly data: FunnelData | undefined;
}

/** The next place a step leads: a Form, the summary page, or the end (where Submit lives). */
export type FunnelStep =
  | { readonly kind: 'form'; readonly formId: string }
  | { readonly kind: 'summary' }
  | { readonly kind: 'end' };

/** The Funnel's nodes by id and its drawn edges — built once per question. */
export interface FunnelGraph {
  readonly forms: ReadonlyMap<string, FunnelElement>;
  readonly conditions: ReadonlyMap<string, FunnelCondition>;
  readonly edges: readonly FunnelEdge[];
}

export function graphOf(funnel: FunnelElement): FunnelGraph {
  const forms = new Map<string, FunnelElement>();
  for (const form of formsOf(funnel)) {
    const id = nodeIdOf(form);
    if (id !== undefined && !forms.has(id)) forms.set(id, form);
  }
  return {
    forms,
    conditions: new Map(conditionsOf(funnel).map((c) => [c.id, c] as const)),
    edges: funnelEdges(funnel),
  };
}

/** The edge a node leaves by: a Condition's by the answers (rule 6), a Form's first. */
export function edgeFrom(
  context: FunnelContext,
  graph: FunnelGraph,
  nodeId: string,
): FunnelEdge | undefined {
  const condition = graph.conditions.get(nodeId);
  return condition === undefined
    ? graph.edges.find((edge) => edge.source === nodeId)
    : conditionEdge(condition, graph.edges, context.schema, context.data);
}

/**
 * Rule 8: the Form the walk LANDS on after leaving `nodeId` — through any Conditions — or `undefined` at the end. A
 * repeated node ends the walk, so a hand-edited cycle can never loop.
 */
export function landingFrom(
  context: FunnelContext,
  nodeId: string,
  graph: FunnelGraph = graphOf(context.funnel),
): string | undefined {
  const seen = new Set([nodeId]);
  let current = nodeId;
  for (;;) {
    const target = edgeFrom(context, graph, current)?.target;
    if (target === undefined || seen.has(target)) return undefined;
    if (graph.forms.has(target)) return target;
    if (!graph.conditions.has(target)) return undefined;
    seen.add(target);
    current = target;
  }
}

/** Rule 9: the Form a fill opens on — the start node itself, or the first Form the walk from it lands on. */
export function startFormId(context: FunnelContext): string | undefined {
  const graph = graphOf(context.funnel);
  const start = startNodeOf(context.funnel);
  if (start === undefined) return undefined;
  return graph.forms.has(start) ? start : landingFrom(context, start, graph);
}

/** Rule 10: what Next leads to from `formId`. */
export function nextStep(context: FunnelContext, formId: string): FunnelStep {
  const next = landingFrom(context, formId);
  if (next !== undefined) return { kind: 'form', formId: next };
  return showsSummaryPage(context.funnel) ? { kind: 'summary' } : { kind: 'end' };
}

/** The visited set with `formId` added — the SAME set when it is already there, so state does not churn. */
export function visitedWith(
  visited: ReadonlySet<string>,
  formId: string | undefined,
): ReadonlySet<string> {
  if (formId === undefined || visited.has(formId)) return visited;
  return new Set(visited).add(formId);
}

/**
 * Rule 13: the visited set after the listed path changed from `previous` to `next` — everything from the first
 * difference, in both lists, is no longer progress (the current Form excepted). The same set when nothing goes.
 */
export function visitedAfterPathChange(
  previous: readonly string[],
  next: readonly string[],
  visited: ReadonlySet<string>,
  currentId: string | undefined,
): ReadonlySet<string> {
  let first = 0;
  while (first < previous.length && first < next.length && previous[first] === next[first])
    first += 1;
  const reset = new Set([...previous.slice(first), ...next.slice(first)]);
  reset.delete(currentId ?? '');
  if (![...reset].some((id) => visited.has(id))) return visited;
  return new Set([...visited].filter((id) => !reset.has(id)));
}
