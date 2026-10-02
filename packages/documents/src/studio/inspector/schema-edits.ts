import type { DocumentContent } from '../document-types';
import { recordOf } from './inspector-target';

/**
 * `content` with `patch` merged over the schema property `key` (doc 249): a key whose value is `undefined` is
 * removed. The SAME object for an unknown property or a patch that changes nothing.
 */
export function updateProperty(
  content: DocumentContent,
  key: string,
  patch: Record<string, unknown>,
): DocumentContent {
  const properties = recordOf(content.schema['properties']);
  const property = recordOf(properties?.[key]);
  if (properties === undefined || property === undefined) return content;
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
  if (!changed) return content;
  return {
    ...content,
    schema: { ...content.schema, properties: { ...properties, [key]: next } },
  };
}

/** `content` with `key` added to / removed from the root `required` (rule 11); an emptied array is removed. */
export function setRequired(
  content: DocumentContent,
  key: string,
  required: boolean,
): DocumentContent {
  const current = content.schema['required'];
  const list = Array.isArray(current) ? (current as unknown[]) : [];
  if (list.includes(key) === required) return content;
  const next = required ? [...list, key] : list.filter((k) => k !== key);
  const { required: _previous, ...schema } = content.schema;
  return { ...content, schema: next.length === 0 ? schema : { ...schema, required: next } };
}

/** Values compared by content: JSONForms hands back new identities for unchanged objects. */
export function sameValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}
