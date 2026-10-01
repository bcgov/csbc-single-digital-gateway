import type { ConditionRow } from '@repo/forms';
import type { Uischema } from './document-types';
import { idOf, newId } from './element-ids';
import {
  conditionsOf,
  edgesOf,
  elementsOf,
  formsOf,
  isForm,
  leaves,
  outputOf,
  startOf,
  withFunnel,
  withStart,
  type FunnelCondition,
  type FunnelEdge,
  type NodeOutput,
} from './funnel-model';

/** What a + adds. */
export type NodeKind = 'form' | 'condition';

/** The empty Form every add inserts, and the root "Add a form" gives an empty variant. */
export function newForm(): Uischema {
  return { id: newId(), type: 'Form', elements: [] };
}

export function newRow(label: string): ConditionRow {
  return { id: newId(), label, match: 'all', clauses: [] };
}

/** An edge from `output` to `target`; a default/Form output writes NO `sourceHandle` key. */
export function edgeFrom(output: NodeOutput, target: string): FunnelEdge {
  return { id: newId(), ...output, target };
}

/**
 * The parts a new node brings. A Condition starts with ONE unset branch, `Condition 1`, leading to a new Form — every
 * branch has a connected Form — and, when `defaultTarget` is given, its default output leads there. `'new'` gives the
 * default a new Form of its own (an append, where nothing follows); a split passes the old target.
 */
function created(
  kind: NodeKind,
  defaultTarget: string | 'new',
): { id: string; forms: Uischema[]; conditions: FunnelCondition[]; edges: FunnelEdge[] } {
  if (kind === 'form') {
    const form = newForm();
    const id = idOf(form)!;
    const onward = defaultTarget === 'new' ? [] : [edgeFrom({ source: id }, defaultTarget)];
    return { id, forms: [form], conditions: [], edges: onward };
  }
  const row = newRow('Condition 1');
  const branch = newForm();
  const fallback = defaultTarget === 'new' ? newForm() : undefined;
  const condition: FunnelCondition = { id: newId(), type: 'Condition', options: { rows: [row] } };
  return {
    id: condition.id,
    forms: fallback === undefined ? [branch] : [branch, fallback],
    conditions: [condition],
    edges: [
      edgeFrom({ source: condition.id, sourceHandle: row.id }, idOf(branch)!),
      edgeFrom(
        { source: condition.id },
        defaultTarget === 'new' ? idOf(fallback!)! : defaultTarget,
      ),
    ],
  };
}

/** A lone `Form` root becomes a `Funnel` holding it, and starting at it; a Funnel is returned as is. */
function asFunnel(uischema: Uischema): Uischema {
  if (uischema['type'] !== 'Form') return uischema;
  return {
    id: newId(),
    type: 'Funnel',
    elements: [uischema],
    options: { start: idOf(uischema), conditions: [], edges: [] },
  };
}

/** `elements` with `forms` placed right after the element `afterId` (or at the end). */
function placed(elements: unknown[], afterId: string, forms: Uischema[]): unknown[] {
  const at = elements.findIndex((el) => isForm(el) && idOf(el) === afterId);
  return at === -1 ? [...elements, ...forms] : elements.toSpliced(at + 1, 0, ...forms);
}

/**
 * Adds a node after a FREE `output` (the trailing +) and connects it; a Condition arrives with its unset first branch
 * and its default each leading to a new Form. A lone Form root becomes a Funnel first.
 */
export function addAfter(uischema: Uischema, output: NodeOutput, kind: NodeKind): Uischema {
  const hasSource =
    formsOf(uischema).some((f) => idOf(f) === output.source) ||
    conditionsOf(uischema).some((c) => c.id === output.source);
  if (!hasSource || edgesOf(uischema).some((e) => leaves(e, output))) return uischema;
  const funnel = asFunnel(uischema);
  const node = created(kind, 'new');
  return withFunnel(funnel, {
    elements: placed(elementsOf(funnel), output.source, node.forms),
    conditions: [...conditionsOf(funnel), ...node.conditions],
    edges: [...edgesOf(funnel), edgeFrom(output, node.id), ...node.edges],
  });
}

/**
 * Splits `edgeId` with a new node: the edge is RETARGETED at it (keeping its id) and the node's Form output — or a
 * Condition's DEFAULT output — continues to the old target, so nothing downstream is orphaned.
 */
export function addBetween(uischema: Uischema, edgeId: string, kind: NodeKind): Uischema {
  const edges = edgesOf(uischema);
  const split = edges.find((e) => e.id === edgeId);
  if (uischema['type'] !== 'Funnel' || split === undefined) return uischema;
  const node = created(kind, split.target);
  return withFunnel(uischema, {
    elements: placed(elementsOf(uischema), split.source, node.forms),
    conditions: [...conditionsOf(uischema), ...node.conditions],
    edges: [...edges.map((e) => (e.id === edgeId ? retargeted(e, node.id) : e)), ...node.edges],
  });
}

/** `edge` pointed at `target` instead, keeping its id and the output it leaves by. */
function retargeted(edge: FunnelEdge, target: string): FunnelEdge {
  return { id: edge.id, ...outputOf(edge), target };
}

/**
 * Removes a node and its edges, bridging what led INTO it onward so a path keeps flowing: a Form's incoming outputs
 * connect to its target; a Condition's connect to its DEFAULT target (its branch Forms stay, unconnected), and the
 * Funnel's start follows the same way. A lone
 * `Form` root empties the variant; a Funnel left with one Form and no Conditions is unwrapped to that Form.
 */
export function removeNode(uischema: Uischema, id: string): Uischema {
  if (uischema['type'] === 'Form') return idOf(uischema) === id ? {} : uischema;
  if (uischema['type'] !== 'Funnel') return uischema;
  const elements = elementsOf(uischema).filter((el) => !(isForm(el) && idOf(el) === id));
  const conditions = conditionsOf(uischema).filter((c) => c.id !== id);
  if (
    elements.length === elementsOf(uischema).length &&
    conditions.length === conditionsOf(uischema).length
  ) {
    return uischema;
  }
  const edges = edgesOf(uischema);
  const onward = edges.find((e) => e.source === id && e.sourceHandle === undefined)?.target;
  const kept = edges.filter((e) => e.source !== id && e.target !== id);
  const bridges =
    onward === undefined
      ? []
      : edges
          .filter((e) => e.target === id)
          .map(outputOf)
          .filter((output) => !kept.some((e) => leaves(e, output)))
          .map((output) => edgeFrom(output, onward));

  const forms = elements.filter(isForm);
  if (conditions.length === 0 && forms.length === 1 && elements.length === 1) return forms[0]!;
  if (conditions.length === 0 && elements.length === 0) return {};
  const next = withFunnel(uischema, { elements, conditions, edges: [...kept, ...bridges] });
  // Deleting the start moves it onward — to a Form's target, or a Condition's default target — never to whichever
  // node happens to be left unconnected.
  return startOf(uischema) === id ? withStart(next, onward) : next;
}
