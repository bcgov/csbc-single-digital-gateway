import type { Governance } from '../capabilities/governance';
import { createAjv } from '@jsonforms/core';
import type { DocumentContent } from '../document-types';
import type { InspectorField } from './inspector-field';
import { fieldsFor } from './inspector-form';
import type { InspectorTarget } from './inspector-target';
import { sameValue } from './schema-edits';

const ajv = createAjv();

/** Whether `value` satisfies the field's own schema (doc 249 rule 8). An empty value always may be written. */
function accepts(field: InspectorField, target: InspectorTarget, value: unknown): boolean {
  return value === undefined || ajv.validate(field.schema(target), value) === true;
}

/**
 * `content` with the inspector form's `values` written for `target` (doc 249 rules 7-15). Only fields that apply are
 * read; a missing key is a cleared value; an unchanged or rejected value is skipped. The SAME object when nothing was
 * written, so JSONForms' mount emit never dirties the studio.
 */
export function applyInspector(
  content: DocumentContent,
  target: InspectorTarget,
  values: Record<string, unknown>,
  governance?: Governance,
): DocumentContent {
  let next = content;
  for (const field of fieldsFor(target)) {
    // Backstop (doc 259 rule 15): a setting the pinned template locks is never written.
    if (governance?.canEdit(target.id, field.key) === false) continue;
    const value = values[field.key];
    if (sameValue(value, field.read(target)) || !accepts(field, target, value)) continue;
    next = field.write(next, target, value);
  }
  return next;
}
