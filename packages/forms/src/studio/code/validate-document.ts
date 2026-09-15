import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import { flowProblems } from '../../renderers/xyflow/flow-graph';
import type { DocumentProblem } from './document-text';
import { SCHEMA_METASCHEMA } from './metaschema/schema-metaschema';
import { UISCHEMA_METASCHEMA } from './metaschema/uischema-metaschema';

// The apply gate (doc 191 rule 16b-c): a parsed value may replace a half of the studio document only when it passes
// that half's metaschema — and, for a schema, only when JSONForms' Ajv can compile it, since the canvas would throw.

type Ajv = ReturnType<typeof createAjv>;
type Validator = ReturnType<Ajv['compile']>;
type AjvError = NonNullable<Validator['errors']>[number];

export type DocumentCheck<T> =
  | { readonly valid: true; readonly value: T }
  | { readonly valid: false; readonly problems: readonly DocumentProblem[] };

let shared: Ajv | undefined;
/** One Ajv with JSONForms' own options, created on first use. */
const ajv = (): Ajv => (shared ??= createAjv());

// An `if` failure only says "must match then" beside the real error from the branch — drop it.
const toProblems = (errors: readonly AjvError[] | null | undefined): DocumentProblem[] =>
  (errors ?? [])
    .filter((error) => error.keyword !== 'if')
    .map((error) => ({ path: error.instancePath, message: error.message ?? 'is invalid' }));

function check<T>(metaschema: object, value: unknown): DocumentCheck<T> {
  const validate = ajv().compile(metaschema);
  if (validate(value)) return { valid: true, value: value as T };
  return { valid: false, problems: toProblems(validate.errors) };
}

/** A studio-profile schema that JSONForms' Ajv compiles. */
export function validateSchemaDocument(value: unknown): DocumentCheck<JsonSchema> {
  const result = check<JsonSchema>(SCHEMA_METASCHEMA, value);
  if (!result.valid) return result;
  const instance = ajv();
  try {
    instance.compile(result.value);
    return result;
  } catch (error) {
    return {
      valid: false,
      problems: [{ path: '', message: error instanceof Error ? error.message : String(error) }],
    };
  } finally {
    // Typed schemas are compiled on every apply — never let them accumulate in Ajv's cache.
    instance.removeSchema(result.value);
  }
}

/**
 * A uischema built from the studio's element types. A Flow must also pass the checks a metaschema can't express (doc 195
 * rule 18): unique Stage ids, edge ends that name a Stage, and no self-loops, repeated edges or cycles.
 */
export function validateUischemaDocument(value: unknown): DocumentCheck<UISchemaElement> {
  const result = check<UISchemaElement>(UISCHEMA_METASCHEMA, value);
  if (!result.valid || result.value.type !== FLOW_TYPE) return result;
  const problems = flowProblems(result.value);
  return problems.length === 0 ? result : { valid: false, problems };
}
