import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import type { ElementPatch } from '../renderers/studio/studio-editor';

export type { ElementPatch };

/**
 * `uischema` with `patch` applied to the element whose `id` is `id`, at any depth under `elements` (doc 236 rule 13).
 * The SAME object when no element has that id, so a caller can skip a no-op write.
 */
export function updateElement(uischema: Uischema, id: string, patch: ElementPatch): Uischema {
  if (idOf(uischema) === id) return patched(uischema, patch);
  const elements = uischema['elements'];
  if (!Array.isArray(elements)) return uischema;
  const next = elements.map((child: unknown) =>
    isRecord(child) ? updateElement(child, id, patch) : child,
  );
  return next.some((child, i) => child !== elements[i])
    ? { ...uischema, elements: next }
    : uischema;
}

function patched(element: Uischema, patch: ElementPatch): Uischema {
  const { options, elements } = patch;
  let next = element;
  if ('label' in patch) {
    const { label: _previous, ...rest } = next;
    // An existing key keeps its place: the studio's dirty check compares documents as JSON text.
    next = patch.label === undefined ? rest : { ...next, label: patch.label };
  }
  if (options !== undefined) {
    const merged: Record<string, unknown> = {
      ...(isRecord(element['options']) ? element['options'] : {}),
    };
    for (const [key, value] of Object.entries(options)) {
      if (value === undefined) delete merged[key];
      else merged[key] = value;
    }
    next = { ...next, options: merged };
  }
  return elements === undefined ? next : { ...next, elements };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
