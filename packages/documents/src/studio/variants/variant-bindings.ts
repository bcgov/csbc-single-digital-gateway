import type { Uischema } from '../document-types';

/** A Control bound to a top-level schema property — the only binding a variant places (doc 262). */
const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/** The scope a Control over property `key` carries. */
export function scopeOf(key: string): string {
  return `#/properties/${key}`;
}

/** The top-level property `scope` names, if it names one. */
export function keyOfScope(scope: unknown): string | undefined {
  return typeof scope === 'string' ? PROPERTY_SCOPE.exec(scope)?.[1] : undefined;
}

/** Every Control at or below `node`, in reading order — every Form of a Funnel included. */
export function controlsOf(node: Uischema): Uischema[] {
  const own = node['type'] === 'Control' ? [node] : [];
  const elements = node['elements'];
  if (!Array.isArray(elements)) return own;
  return [...own, ...elements.filter(isRecord).flatMap(controlsOf)];
}

/** The top-level property keys the Controls at or below `node` bind, first binding first, each once. */
export function boundKeys(node: Uischema): string[] {
  const keys = controlsOf(node)
    .map((control) => keyOfScope(control['scope']))
    .filter((key): key is string => key !== undefined);
  return [...new Set(keys)];
}

/** Whether `node` is, or holds, a Control. */
export function holdsControl(node: Uischema): boolean {
  return controlsOf(node).length > 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
