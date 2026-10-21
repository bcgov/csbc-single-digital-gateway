import { isObjectArray, tableRows } from '../ui/object-array';
import { plainValue } from './plain-value';

// Doc 283 rules 2-12: what `unanswered: 'hide'` leaves of a uischema. Pure; NEW objects only along changed paths, so a
// fully answered document comes back as the SAME object.

type Node = Record<string, unknown>;

/** A Control bound to a top-level property — the only answers a document holds (`content.data` is flat by key). */
const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/**
 * Rule 2: an answered Control — a scalar whose plain value is defined, an object array with a row. The SAME predicates
 * the plain renderers draw "Not answered" from, so hiding and showing never disagree. Rules are not consulted.
 */
export function isAnswered(control: unknown, schema: unknown, data: unknown): boolean {
  const scope = recordOf(control)?.['scope'];
  const key = typeof scope === 'string' ? PROPERTY_SCOPE.exec(scope)?.[1] : undefined;
  const property =
    key === undefined ? undefined : recordOf(recordOf(schema)?.['properties'])?.[key];
  if (key === undefined || property === undefined) return false;
  const value = recordOf(data)?.[key];
  return isObjectArray(property)
    ? tableRows(value).length > 0
    : plainValue(property, control, value) !== undefined;
}

/**
 * `element` without its unanswered Controls and the containers left without an answer (rules 3-9); `undefined` when
 * nothing in it is answered. Display elements stay beside an answer and go with an empty container (rule 5).
 */
export function pruneUnanswered(
  element: unknown,
  schema: unknown,
  data: unknown,
): Node | undefined {
  const node = recordOf(element);
  if (node === undefined) return undefined;
  if (node['type'] === 'Control') return isAnswered(node, schema, data) ? node : undefined;
  const elements = node['elements'];
  // A leaf that is not a Control — a display element — holds no answer of its own.
  if (!Array.isArray(elements)) return undefined;
  const pruned = elements.map((child: unknown) => pruneUnanswered(child, schema, data));
  if (pruned.every((child) => child === undefined)) return undefined;
  const kept =
    node['type'] === 'Card'
      ? cardSlots(elements, pruned)
      : elements.flatMap((child: unknown, index): unknown[] => {
          const result = pruned[index];
          if (result !== undefined) return [result];
          return isContainerOrControl(child) ? [] : [child];
        });
  return kept.length === elements.length && kept.every((child, index) => child === elements[index])
    ? node
    : { ...node, elements: kept };
}

/**
 * Rule 6: a Card's slots are POSITIONAL (content, then footer — doc 273), so a slot is never removed from the front: an
 * empty content slot stays, emptied, while the footer holds an answer; an empty trailing slot goes.
 */
function cardSlots(elements: readonly unknown[], pruned: readonly (Node | undefined)[]): unknown[] {
  const last = pruned.findLastIndex((slot) => slot !== undefined);
  return elements.slice(0, last + 1).map((slot: unknown, index) => pruned[index] ?? emptied(slot));
}

/** A slot kept for its position, with nothing in it. */
function emptied(slot: unknown): Node {
  return Object.assign({}, recordOf(slot), { elements: [] });
}

/** A Control, or anything holding `elements` — what an unanswered result removes. Display elements are neither. */
function isContainerOrControl(element: unknown): boolean {
  const node = recordOf(element);
  return node !== undefined && (node['type'] === 'Control' || Array.isArray(node['elements']));
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
