import { DEFAULT_VARIANT, variantOf, withVariant, type DocumentContent } from '../document-types';
import { updateElement, type ElementPatch } from '../element-edits';
import type { InspectorTarget, TargetKind } from './inspector-target';

/** The inspector's sections, in order (doc 249). */
export const INSPECTOR_SECTIONS = Object.freeze(['General', 'Validation', 'Appearance'] as const);
export type InspectorSection = (typeof INSPECTOR_SECTIONS)[number];

/** One editable property: where it shows, how it is typed, read and written. */
export interface InspectorField {
  /** Unique across the registry: the inspector form's property name. */
  key: string;
  section: InspectorSection;
  label: string;
  applies: (target: InspectorTarget) => boolean;
  /** The field's JSON Schema — also what a value must satisfy to be written (rule 8). */
  schema: (target: InspectorTarget) => Record<string, unknown>;
  /** The current value; `undefined` = empty. */
  read: (target: InspectorTarget) => unknown;
  /** `content` with `value` written; `undefined` = cleared (rule 7). */
  write: (content: DocumentContent, target: InspectorTarget, value: unknown) => DocumentContent;
  /** Extra uischema `options` for the field's Control (e.g. `component: 'textarea'`). */
  options?: Record<string, unknown>;
  /** The inspector form requires a value (a select that always has one, so it offers no Clear). */
  required?: boolean;
  /** It writes the schema, which only the default variant edits (doc 262 rule 13e): read-only elsewhere. */
  schemaLevel?: boolean;
}

/** Whether the target is in the default variant — the only one that edits the schema (doc 262 rule 13). */
export const inDefault = (target: InspectorTarget): boolean => target.variant === DEFAULT_VARIANT;

/** Whether `field` is read-only on `target` because it writes the schema outside default (doc 262 rule 13e). */
export function schemaLocked(field: InspectorField, target: InspectorTarget): boolean {
  return field.schemaLevel === true && !inDefault(target);
}

export const STRING = Object.freeze({ type: 'string' });
export const BOOLEAN = Object.freeze({ type: 'boolean' });
export const NUMBER = Object.freeze({ type: 'number' });
/** A small switch, the inspector's boolean control (doc 188). */
export const SMALL_SWITCH = Object.freeze({ component: 'switch', size: 'sm' });
/** A rich text value (doc 250 rule 1): the inspector draws the Rich text control for it. */
export const RICH_TEXT = Object.freeze({ type: 'object', required: ['root'] });
/** A length: whole, never negative — Ajv refuses anything else in the document schema. */
export const WHOLE_NUMBER = Object.freeze({ type: 'integer', minimum: 0 });

/** A select over `choices`, by const type. */
export function choice(
  choices: ReadonlyArray<readonly [string | number, string]>,
): Record<string, unknown> {
  const type = typeof choices[0]?.[0] === 'number' ? 'integer' : 'string';
  return { type, oneOf: choices.map(([value, title]) => ({ const: value, title })) };
}

/** Whether the target is one of `kinds`. */
export const isKind =
  (...kinds: TargetKind[]) =>
  (target: InspectorTarget): boolean =>
    kinds.includes(target.kind);

/** `content` with `patch` applied to the target element; the same object when nothing changed. */
export function patchElement(
  content: DocumentContent,
  target: InspectorTarget,
  patch: ElementPatch,
): DocumentContent {
  const root = variantOf(content, target.variant);
  const next = updateElement(root, target.id, patch);
  return next === root ? content : withVariant(content, next, target.variant);
}

/** The target element's `options[name]`. */
export function optionOf(target: InspectorTarget, name: string): unknown {
  const options = target.element['options'];
  return typeof options === 'object' && options !== null
    ? (options as Record<string, unknown>)[name]
    : undefined;
}

/** `undefined` for an empty string or the default — an absent key (rule 7). */
export function absentIf(value: unknown, fallback?: unknown): unknown {
  return value === '' || value === null || value === fallback ? undefined : value;
}
