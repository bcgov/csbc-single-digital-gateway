import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import { elementsOf, formsOf } from './funnel-model';

/**
 * Which Form the canvas is zoomed in on (doc 233 rule 1): `'default'` until the author chooses — a top-level Form is
 * focused by default — then a Form's id, or `null` after Back.
 */
export type FocusState = 'default' | string | null;

/** The focused Form's id, or `null`. An id naming no Form (e.g. one just deleted) focuses nothing. */
export function resolveFocus(uischema: Uischema, focus: FocusState): string | null {
  if (focus === null) return null;
  if (focus === 'default') return uischema['type'] === 'Form' ? (idOf(uischema) ?? null) : null;
  return formsOf(uischema).some((f) => idOf(f) === focus) ? focus : null;
}

/**
 * The fields a focused Form's placeholder page lists (rule 4): every `Control` at any depth, named by its `label`, else
 * its schema property's `title`, else the property key.
 */
export function pageFields(form: Uischema, schema: Record<string, unknown>): string[] {
  const properties = isRecord(schema['properties']) ? schema['properties'] : {};
  const walk = (element: Uischema): string[] => {
    if (element['type'] === 'Control') return [controlName(element, properties)];
    return elementsOf(element).flatMap((child) => (isRecord(child) ? walk(child) : []));
  };
  return elementsOf(form).flatMap((child) => (isRecord(child) ? walk(child) : []));
}

function controlName(control: Uischema, properties: Record<string, unknown>): string {
  const label = control['label'];
  if (typeof label === 'string' && label !== '') return label;
  const scope = control['scope'];
  const key = typeof scope === 'string' ? (scope.split('/').at(-1) ?? scope) : 'Field';
  const property = properties[key];
  const title = isRecord(property) ? property['title'] : undefined;
  return typeof title === 'string' && title !== '' ? title : key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
