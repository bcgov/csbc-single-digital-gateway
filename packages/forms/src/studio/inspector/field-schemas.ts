import type { JsonSchema } from '@jsonforms/core';

// The inspector's shared field schemas (doc 187 rules 9-11b), in their own module so inspector-fields.ts and
// layout-fields.ts can both use them (doc 194 rule 18).

export const STRING: JsonSchema = Object.freeze({ type: 'string' });
export const BOOLEAN: JsonSchema = Object.freeze({ type: 'boolean' });
export const NUMBER: JsonSchema = Object.freeze({ type: 'number' });

export const integer = (bounds: { minimum?: number; maximum?: number }): JsonSchema => ({
  type: 'number',
  ...bounds,
  multipleOf: 1,
});

/**
 * Rule 11b: every whole number from `minimum` to `maximum` as a oneOf titled by the number, so renderers/ui renders
 * a Combobox rather than a NumberInput.
 */
export const wholeNumbers = (minimum: number, maximum: number): JsonSchema => ({
  type: 'number',
  oneOf: Array.from({ length: Math.max(0, maximum - minimum + 1) }, (_unused, index) => ({
    const: minimum + index,
    title: String(minimum + index),
  })),
});
