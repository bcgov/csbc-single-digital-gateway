import type { UiElement } from './types';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * `'#/properties/details/properties/faq'` → `['details', 'faq']`. Tolerates a missing leading `#`
 * and any stray empty segments.
 */
export function scopePath(scope: string): string[] {
  return scope
    .split('/')
    .filter((segment) => segment !== '' && segment !== '#' && segment !== 'properties');
}

/** Every `scope` in a uischema subtree, pre-order. */
export function collectScopes(elements: readonly UiElement[]): string[] {
  const scopes: string[] = [];
  const visit = (element: unknown): void => {
    const node = asRecord(element);
    if (typeof node.scope === 'string') {
      scopes.push(node.scope);
    }
    const children = node.elements;
    if (Array.isArray(children)) {
      children.forEach(visit);
    }
  };
  elements.forEach(visit);
  return scopes;
}

/**
 * The full schema with every object `required` along the `properties` spine filtered down to the
 * properties this uischema subtree actually contains.
 *
 * This is load-bearing for windowed editing. `FormRunner` validates against the schema it is handed
 * with `ValidationMode.ValidateAndShow` and disables Submit while any error stands — so handing it
 * the WHOLE service schema would block saving one section because a *different* section's required
 * field happens to be empty. Pruning `required` scopes validation to what the window can actually
 * fix. Nothing else is removed: `properties` stay intact so absolute control scopes
 * (`#/properties/...`) still resolve, exactly as they do for the read-only per-run render.
 *
 * `items.required` is deliberately left ALONE — that is per-item validation for array fields
 * (accordion groups), evaluated only when an item exists, so it is always relevant to the item
 * being edited.
 *
 * Whole-document validity is not this function's job: drafts are saved unvalidated and `publish`
 * runs the full Ajv pass over the untouched schema.
 */
export function scopedSchema(
  schema: Record<string, unknown>,
  elements: readonly UiElement[],
): Record<string, unknown> {
  const paths = collectScopes(elements).map(scopePath);

  const prune = (node: unknown, prefix: readonly string[]): unknown => {
    if (Array.isArray(node)) {
      return node;
    }
    if (node === null || typeof node !== 'object') {
      return node;
    }
    const source = node as Record<string, unknown>;
    const next: Record<string, unknown> = { ...source };

    if (Array.isArray(source.required)) {
      next.required = (source.required as unknown[]).filter(
        (key) =>
          typeof key === 'string' &&
          paths.some(
            (path) =>
              path.length > prefix.length &&
              path[prefix.length] === key &&
              prefix.every((segment, index) => path[index] === segment),
          ),
      );
    }

    const properties = asRecord(source.properties);
    if (Object.keys(properties).length > 0) {
      next.properties = Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, prune(value, [...prefix, key])]),
      );
    }

    return next;
  };

  return prune(schema, []) as Record<string, unknown>;
}
