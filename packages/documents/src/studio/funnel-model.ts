import {
  optionsOf,
  startNodeOf,
  startOf,
  type FunnelCondition,
  type FunnelEdge,
} from '../renderers/default/funnel/funnel-graph';
import type { DocumentContent, Uischema } from './document-types';

// The pure graph readers live with the Funnel renderer (doc 274 rule 1), which may not import `studio/`; they are
// re-exported here so every studio caller keeps one import site.
export {
  conditionsOf,
  drawnEdges,
  edgesOf,
  elementsOf,
  formsOf,
  isCondition,
  isForm,
  nodeIdsOf,
  optionsOf,
  startOf,
  type FunnelCondition,
  type FunnelEdge,
} from '../renderers/default/funnel/funnel-graph';

/** One output of a node: a Form's only output, a Condition row (`sourceHandle`), or a Condition's default. */
export interface NodeOutput {
  source: string;
  sourceHandle?: string;
}

/** The canvas handle id of a Condition's default output. Never written to an edge — the default has no handle. */
export const DEFAULT_HANDLE = 'default';

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
  const start = startNodeOf(uischema);
  return start === startOf(uischema) ? uischema : withStart(uischema, start);
}

/** `content` with every variant's start ensured; the same object when nothing changed. */
export function ensureContentStart(content: DocumentContent): DocumentContent {
  const entries = Object.entries(content.variants).map(
    ([name, v]) => [name, ensureStart(v)] as const,
  );
  if (entries.every(([name, v]) => v === content.variants[name])) return content;
  return { ...content, variants: Object.fromEntries(entries) as DocumentContent['variants'] };
}
