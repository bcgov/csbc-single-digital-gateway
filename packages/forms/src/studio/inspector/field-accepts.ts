import type { JsonSchema } from '@jsonforms/core';

/**
 * Whether `value` satisfies a field schema (doc 187 rule 16): one of its `oneOf` consts when it has any (doc 188 rule
 * 29), its JSON type and, for numbers, `minimum`, `maximum`, `exclusiveMinimum` and `multipleOf`. Clearing
 * (`undefined`) is always accepted. Its own module so `inspector-fields.ts` stays under 300 lines (doc 193 rule 15).
 */
export function fieldAccepts(schema: JsonSchema, value: unknown): boolean {
  if (value === undefined) return true;
  /**
   * Doc 207 rule 24: an OBJECT-typed field carries an object — rich content is the first.
   *
   * This does NOT reopen doc 206 rule 2's refusal of arrays: that was an array of DOCUMENT CONTENT (an
   * option list) which JSONForms was never carrying, and it still has no business on this channel. A rich
   * text value is a single field value JSONForms carries natively, so an array is refused here too — in
   * JavaScript an array IS an object, which is exactly the confusion this guard has to avoid.
   */
  if (schema.type === 'object')
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  if (Array.isArray(schema.oneOf) && !schema.oneOf.some((entry) => entry.const === value))
    return false;
  if (schema.type === 'string') return typeof value === 'string';
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type !== 'number' || typeof value !== 'number' || !Number.isFinite(value))
    return false;

  const { minimum, maximum, exclusiveMinimum, multipleOf } = schema;
  if (typeof minimum === 'number' && value < minimum) return false;
  if (typeof maximum === 'number' && value > maximum) return false;
  if (typeof exclusiveMinimum === 'number' && value <= exclusiveMinimum) return false;
  return typeof multipleOf !== 'number' || Number.isInteger(value / multipleOf);
}
