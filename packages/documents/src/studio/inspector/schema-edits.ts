import type { DocumentContent } from '../document-types';
import { toRef, withOwner, type PropertyRef } from '../property-ref';
import { recordOf } from './inspector-target';

/**
 * `content` with `patch` merged over the schema property `ref` (doc 249; doc 271: a record item field's property lives in
 * its array's `items.properties`): a key whose value is `undefined` is removed. The SAME object for an unknown property
 * or a patch that changes nothing. A plain string is a page (root) key.
 */
export function updateProperty(
  content: DocumentContent,
  ref: string | PropertyRef,
  patch: Record<string, unknown>,
): DocumentContent {
  const target = toRef(ref);
  const schema = withOwner(content.schema, target, (owner) => {
    const properties = recordOf(owner['properties']);
    const property = recordOf(properties?.[target.key]);
    if (properties === undefined || property === undefined) return owner;
    const next: Record<string, unknown> = { ...property };
    let changed = false;
    for (const [name, value] of Object.entries(patch)) {
      if (value === undefined) {
        if (!(name in next)) continue;
        delete next[name];
      } else if (sameValue(next[name], value)) continue;
      else next[name] = value;
      changed = true;
    }
    return changed ? { ...owner, properties: { ...properties, [target.key]: next } } : owner;
  });
  return schema === content.schema ? content : { ...content, schema };
}

/**
 * `content` with `ref` added to / removed from its owner's `required` (rule 11; an item field's is `items.required`);
 * an emptied array is removed.
 */
export function setRequired(
  content: DocumentContent,
  ref: string | PropertyRef,
  required: boolean,
): DocumentContent {
  const target = toRef(ref);
  const schema = withOwner(content.schema, target, (owner) => {
    const current = owner['required'];
    const list = Array.isArray(current) ? (current as unknown[]) : [];
    if (list.includes(target.key) === required) return owner;
    const next = required ? [...list, target.key] : list.filter((k) => k !== target.key);
    const { required: _previous, ...rest } = owner;
    return next.length === 0 ? rest : { ...rest, required: next };
  });
  return schema === content.schema ? content : { ...content, schema };
}

/** Values compared by content: JSONForms hands back new identities for unchanged objects. */
export function sameValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
