import {
  DEFAULT_VARIANT,
  variantOf,
  withVariant,
  type DocumentContent,
  type Uischema,
} from './document-types';
import { findById } from './element-ids';
import { moveElement } from './element-move';
import type { GridDrop } from '../renderers/default/grid-placement';
import { conditionsOf } from './funnel-model';
import { replaceById } from './grid-edits';
import {
  ownerOf,
  propertyAt,
  refOfScope,
  requiredAt,
  scopeOf,
  withOwner,
  type PropertyRef,
} from './property-ref';
import { controlScopes, holdsObjectArray, mapScopes, recordArrayOf } from './record-scope';
import { isObjectArray } from '../renderers/ui/object-array';

/**
 * Doc 271 rule 14: `content` with the element `id` moved into `toLayoutId` at `index`. Within one space (the page, or
 * one record's item form) it is the plain uischema move (doc 243). ACROSS spaces every property the moved subtree binds
 * moves too — between `properties` and the record's `items.properties`, with its `required` membership — and its
 * Controls are rescoped. The SAME content when the move is refused (see `crossingProblem`) or changes nothing.
 */
export function moveAcross(
  content: DocumentContent,
  id: string,
  toLayoutId: string,
  index: number,
  cell?: GridDrop,
  variantName: string = DEFAULT_VARIANT,
): DocumentContent {
  const variant = variantOf(content, variantName);
  const from = recordArrayOf(variant, id);
  const to = recordArrayOf(variant, toLayoutId);
  if (from === to) {
    const moved = moveElement(variant, id, toLayoutId, index, cell);
    return moved === variant ? content : withVariant(content, moved, variantName);
  }
  if (crossingProblem(content, id, toLayoutId, variantName) !== undefined) return content;
  const element = findById(variant, id)!;
  const refs = boundRefs(element);
  const rescope = (scope: string) => {
    const ref = refOfScope(scope);
    return ref === undefined
      ? scope
      : scopeOf(to === undefined ? { key: ref.key } : { array: to, key: ref.key });
  };
  const rescoped = replaceById(variant, id, (node) => mapScopes(node, rescope));
  const moved = moveElement(rescoped, id, toLayoutId, index, cell);
  if (moved === rescoped) return content;
  let schema = content.schema;
  for (const ref of refs) schema = relocated(schema, ref, to);
  return { ...withVariant(content, moved, variantName), schema };
}

/**
 * Why the element `id` may not move into `toLayoutId` across spaces (rule 14), or `undefined` when it may — also the
 * drag-time answer (rule 15). Within one space there is never a problem here.
 */
export function crossingProblem(
  content: DocumentContent,
  id: string,
  toLayoutId: string,
  variantName: string = DEFAULT_VARIANT,
): string | undefined {
  const variant = variantOf(content, variantName);
  const element = findById(variant, id);
  if (element === undefined) return 'unknown element';
  const from = recordArrayOf(variant, id);
  const to = recordArrayOf(variant, toLayoutId);
  if (from === to) return undefined;
  if (variantName !== DEFAULT_VARIANT)
    return 'fields move between a record and the page only in default';
  const propertyOf = (scope: string) => {
    const ref = refOfScope(scope);
    return ref === undefined ? undefined : propertyAt(content.schema, ref);
  };
  if (to !== undefined && holdsObjectArray(element, propertyOf))
    return 'a record cannot hold a table or record';
  for (const ref of boundRefs(element)) {
    if (boundElsewhere(content, scopeOf(ref), id, variantName))
      return `${ref.key} is shown elsewhere`;
    const destination =
      to === undefined ? content.schema : ownerOf(content.schema, { array: to, key: ref.key });
    const properties = destination?.['properties'];
    if (typeof properties !== 'object' || properties === null) return 'no destination';
    if (Object.hasOwn(properties, ref.key)) return `${ref.key} is already used there`;
    if (from === undefined && isTested(content, ref.key)) return `${ref.key} is tested by a rule`;
  }
  return undefined;
}

/** The properties a subtree binds, each once. */
function boundRefs(element: Uischema): PropertyRef[] {
  const seen = new Set<string>();
  return controlScopes(element).flatMap((scope) => {
    const ref = refOfScope(scope);
    if (ref === undefined || seen.has(scope)) return [];
    seen.add(scope);
    return [ref];
  });
}

/** Whether a Control OUTSIDE the moved subtree binds `scope` — in its variant, or in any other. */
function boundElsewhere(
  content: DocumentContent,
  scope: string,
  id: string,
  variantName: string,
): boolean {
  return Object.entries(content.variants).some(([name, root]) => {
    const pruned = name === variantName ? replaceById(root, id, () => ({})) : root;
    return controlScopes(pruned).includes(scope);
  });
}

/** Whether a page field is a rule or Funnel Condition source anywhere (it could not be one inside a record). */
function isTested(content: DocumentContent, key: string): boolean {
  const scope = `"#/properties/${key}`;
  const rules = (node: Uischema): boolean => {
    const rule = node['rule'];
    if (rule !== undefined && JSON.stringify(rule).includes(scope)) return true;
    const elements = node['elements'];
    return Array.isArray(elements) && elements.some((child) => isRecord(child) && rules(child));
  };
  return Object.values(content.variants).some(
    (root) => rules(root) || JSON.stringify(conditionsOf(root)).includes(`"field":"${key}"`),
  );
}

/** `schema` with `ref`'s property (and its `required` membership) moved to the page (`to` undefined) or record `to`. */
function relocated(
  schema: Record<string, unknown>,
  ref: PropertyRef,
  to: string | undefined,
): Record<string, unknown> {
  const property = propertyAt(schema, ref);
  if (
    property === undefined ||
    (to !== undefined && !isObjectArray(propertyAt(schema, { key: to })))
  )
    return schema;
  const required = requiredAt(schema, ref);
  const target: PropertyRef = to === undefined ? { key: ref.key } : { array: to, key: ref.key };
  const removed = withOwner(schema, ref, (owner) => without(owner, ref.key));
  return withOwner(removed, target, (owner) => {
    const properties = isRecord(owner['properties']) ? owner['properties'] : {};
    const list = Array.isArray(owner['required']) ? (owner['required'] as unknown[]) : [];
    return {
      ...owner,
      properties: { ...properties, [ref.key]: property },
      ...(required && { required: [...list, ref.key] }),
    };
  });
}

/** An object schema without the property `key` and its `required` entry (an emptied `required` removed). */
function without(owner: Record<string, unknown>, key: string): Record<string, unknown> {
  const { [key]: _removed, ...properties } = isRecord(owner['properties'])
    ? owner['properties']
    : {};
  const { required, ...rest } = owner;
  const left = Array.isArray(required) ? required.filter((k: unknown) => k !== key) : [];
  return { ...rest, properties, ...(left.length > 0 && { required: left }) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
