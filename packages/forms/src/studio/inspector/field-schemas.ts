import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { labelOf } from '../../renderers/gridstack/element-label';
import { drawnStages } from '../../renderers/xyflow/flow-elements';

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

/**
 * Doc 203 rules 14-16: the Start stage picker's schema and displayed value for a Flow. Lives here, not in
 * inspector-fields.ts, to keep that file under the 300-line gate (the reason `fieldAccepts` moved out too,
 * doc 193 rule 15).
 *
 * `schema` is a oneOf of the Flow's drawn Stages that carry an authored id, named by `labelOf` — a Stage with a
 * placeholder id is left out, since no `startId` could address it (doc 203 rule 3).
 *
 * `value` is the authored `options.startId` ONLY when it names one of those Stages, else `undefined` (rule 16):
 * `fieldAccepts` writes back only a value that is one of the schema's oneOf consts, so a DANGLING startId could
 * be displayed but never re-selected by the author. Showing the picker empty is the honest reading. The Flow's
 * implicit fallback start (the first such Stage, `startStageId`) is deliberately not displayed as a choice made.
 *
 * `choices` is how many Stages the picker can offer. A Flow with none — a new, empty one — must not show the
 * field at all: an EMPTY `oneOf` is an invalid JSON Schema, and JSONForms' Ajv throws "schema is invalid" for the
 * whole inspector form before any renderer runs (doc 182's test trap, hit for real here).
 */
export function startStage(flow: UISchemaElement): {
  schema: JsonSchema;
  value: string | undefined;
  choices: number;
} {
  const stages = drawnStages(flow).filter(({ authored }) => authored);
  const schema: JsonSchema = {
    type: 'string',
    oneOf: stages.map(({ element, id }) => ({ const: id, title: labelOf(element, 'Stage') })),
  };
  const startId = flow.options?.['startId'];
  const named = typeof startId === 'string' && stages.some(({ id }) => id === startId);
  return { schema, value: named ? (startId as string) : undefined, choices: stages.length };
}
