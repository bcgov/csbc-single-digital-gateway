import type { DocumentContent, Uischema } from './document-types';
import { DEFAULT_VARIANT, withVariant } from './document-types';
import { idOf } from './element-ids';

/** A Control bound to a top-level schema property: the only binding a delete cleans up (doc 242 rule 6). */
const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/**
 * `content` without the element whose id is `id` (doc 242 rules 5-6): removed with its subtree from the default
 * variant at any depth — never the root — and every top-level property a removed Control bound deleted from the
 * schema (and `required`) once no Control in any variant references it. The SAME content for an unknown id.
 */
export function removeElement(content: DocumentContent, id: string): DocumentContent {
  const variant = content.variants[DEFAULT_VARIANT];
  const removed: Uischema[] = [];
  const next = without(variant, id, removed);
  if (next === variant) return content;
  const withoutElement = withVariant(content, next);
  const stillBound = boundScopes(Object.values(withoutElement.variants));
  const orphaned = removed
    .flatMap(controlScopes)
    .map((scope) => PROPERTY_SCOPE.exec(scope)?.[1])
    .filter((key): key is string => key !== undefined && !isReferenced(key, stillBound));
  return orphaned.length === 0
    ? withoutElement
    : { ...withoutElement, schema: withoutProperties(content.schema, orphaned) };
}

/** `node` with the child whose id is `id` removed at any depth, collected into `removed`; the root is never a child. */
export function without(node: Uischema, id: string, removed: Uischema[]): Uischema {
  const elements = node['elements'];
  if (!Array.isArray(elements)) return node;
  const kept = elements.filter((child: unknown) => {
    if (isRecord(child) && idOf(child) === id) {
      removed.push(child);
      return false;
    }
    return true;
  });
  const children = kept.map((child: unknown) =>
    isRecord(child) ? without(child, id, removed) : child,
  );
  const changed = kept.length !== elements.length || children.some((c, i) => c !== kept[i]);
  return changed ? { ...node, elements: children } : node;
}

/** Every Control scope at or below `node`. */
function controlScopes(node: Uischema): string[] {
  const own =
    node['type'] === 'Control' && typeof node['scope'] === 'string' ? [node['scope']] : [];
  const elements = node['elements'];
  if (!Array.isArray(elements)) return own;
  return [...own, ...elements.filter(isRecord).flatMap(controlScopes)];
}

function boundScopes(variants: Uischema[]): string[] {
  return variants.flatMap(controlScopes);
}

/** Whether a scope still names `key` itself, or something inside it. */
function isReferenced(key: string, scopes: string[]): boolean {
  const scope = `#/properties/${key}`;
  return scopes.some((s) => s === scope || s.startsWith(`${scope}/`));
}

function withoutProperties(
  schema: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const properties = { ...(isRecord(schema['properties']) ? schema['properties'] : {}) };
  for (const key of keys) delete properties[key];
  const { required, ...rest } = schema;
  const next: Record<string, unknown> = { ...rest, properties };
  if (Array.isArray(required)) {
    const left = required.filter((key: unknown) => !keys.includes(String(key)));
    if (left.length > 0) next['required'] = left;
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
