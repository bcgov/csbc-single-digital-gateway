import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import {
  conditionsOf,
  edgesOf,
  formsOf,
  leaves,
  withFunnel,
  type NodeOutput,
} from './funnel-model';
import { edgeFrom } from './node-edits';

/**
 * What connect mode links (doc 235 rule 5): a trailing edge's free `output` to a node picked next, or a picked node's
 * free output `into` a headless Condition.
 */
export type ConnectSource =
  | { kind: 'output'; output: NodeOutput }
  | { kind: 'into'; nodeId: string };

/** A node's outputs with no edge leaving them: a Form's one output; a Condition's rows in order, then its default. */
export function freeOutputs(uischema: Uischema, nodeId: string): NodeOutput[] {
  const edges = edgesOf(uischema);
  const free = (output: NodeOutput) => !edges.some((e) => leaves(e, output));
  if (formsOf(uischema).some((f) => idOf(f) === nodeId)) {
    return [{ source: nodeId }].filter(free);
  }
  const condition = conditionsOf(uischema).find((c) => c.id === nodeId);
  if (condition === undefined) return [];
  return [
    ...condition.options.rows.map((row) => ({ source: nodeId, sourceHandle: row.id })),
    { source: nodeId },
  ].filter(free);
}

/**
 * The nodes a connection may join (doc 235 rule 7), each with the outputs it would leave by. From an output: every
 * node but its source and anything the source is reached from — a loop. Into a Condition: every node with a free
 * output, but the Condition itself and anything it reaches.
 */
export function connectTargets(
  uischema: Uischema,
  source: ConnectSource,
): Map<string, NodeOutput[]> {
  const nodes = nodeIds(uischema);
  if (source.kind === 'output') {
    const loops = reachingTo(uischema, source.output.source);
    return new Map(
      nodes.filter((id) => !loops.has(id)).map((id) => [id, [source.output]] as const),
    );
  }
  const loops = reachedFrom(uischema, source.nodeId);
  return new Map(
    nodes
      .filter((id) => !loops.has(id))
      .map((id) => [id, freeOutputs(uischema, id)] as const)
      .filter(([, outputs]) => outputs.length > 0),
  );
}

/**
 * The variant with an edge from `output` to `target` (doc 235 rule 9) — or unchanged, for an output that already has
 * an edge, an unknown node, a self-link or a loop.
 */
export function connect(uischema: Uischema, output: NodeOutput, target: string): Uischema {
  const nodes = nodeIds(uischema);
  if (!nodes.includes(output.source) || !nodes.includes(target)) return uischema;
  if (!freeOutputs(uischema, output.source).some((o) => o.sourceHandle === output.sourceHandle)) {
    return uischema;
  }
  if (reachingTo(uischema, output.source).has(target)) return uischema;
  return withFunnel(uischema, { edges: [...edgesOf(uischema), edgeFrom(output, target)] });
}

function nodeIds(uischema: Uischema): string[] {
  if (uischema['type'] !== 'Funnel') return [];
  return [
    ...formsOf(uischema).flatMap((f) => idOf(f) ?? []),
    ...conditionsOf(uischema).map((c) => c.id),
  ];
}

/** `nodeId` and every node it is reached from — a link from `nodeId` into any of them closes a loop. */
function reachingTo(uischema: Uischema, nodeId: string): Set<string> {
  return walk(uischema, nodeId, (e) => [e.target, e.source]);
}

/** `nodeId` and every node it reaches — a link from any of them into `nodeId` closes a loop. */
function reachedFrom(uischema: Uischema, nodeId: string): Set<string> {
  return walk(uischema, nodeId, (e) => [e.source, e.target]);
}

function walk(
  uischema: Uischema,
  from: string,
  step: (edge: { source: string; target: string }) => [from: string, to: string],
): Set<string> {
  const edges = edgesOf(uischema).map(step);
  const seen = new Set<string>();
  const pending = [from];
  while (pending.length > 0) {
    const node = pending.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const [a, b] of edges) if (a === node) pending.push(b);
  }
  return seen;
}
