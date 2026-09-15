import type { JsonSchema } from '@jsonforms/core';

/**
 * Whether `value` satisfies a field schema (doc 187 rule 16): one of its `oneOf` consts when it has any (doc 188 rule
 * 29), its JSON type and, for numbers, `minimum`, `maximum`, `exclusiveMinimum` and `multipleOf`. Clearing
 * (`undefined`) is always accepted. Its own module so `inspector-fields.ts` stays under 300 lines (doc 193 rule 15).
 */
export function fieldAccepts(schema: JsonSchema, value: unknown): boolean {
  if (value === undefined) return true;
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
