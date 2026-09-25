import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { checkCapabilities, type CapabilityMap } from '../../capabilities/index';
import type { EditableDocument } from '../layout/schema-properties';
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

/**
 * Doc 222: the apply gate's THIRD check — what a governing template permits.
 *
 * The code panel is the studio's own bypass: every gate doc 221 installed sits on an affordance, and
 * this pane replaces a whole half of the document with hand-written JSON. The API refuses such a save
 * (doc 222), so without this the author would write valid JSON, watch it apply, and then meet an
 * unexplained 422 on save. Refusing here says which element and which setting, in the pane that
 * caused it.
 *
 * `dangling` violations are dropped: they are a property of the TEMPLATE, not of the edit being
 * applied, so they must not block an author from applying an unrelated change.
 */
export function capabilityProblems(
  previous: EditableDocument,
  submitted: EditableDocument,
  capabilities: CapabilityMap | undefined,
): DocumentProblem[] {
  return checkCapabilities(previous, submitted, capabilities)
    .filter((violation) => violation.severity === 'refused')
    .map((violation) => ({ path: '', message: violation.message }));
}

/**
 * `validate` for one half of the document, refusing what the governing template forbids.
 *
 * A FACTORY because the check needs the document the pane is editing AGAINST — the apply gate's
 * other two checks are pure functions of the pasted value alone. Rebuilding it per render is safe:
 * `useCodeDocument` holds `validate` in a ref and reads it at call time, unlike `loadDocument`, whose
 * identity IS its re-run signal (doc 200 rule 4b).
 */
export function governedUischemaValidator(
  current: EditableDocument,
  capabilities: CapabilityMap | undefined,
): (value: unknown) => DocumentCheck<UISchemaElement> {
  return (value) => {
    const result = validateUischemaDocument(value);
    if (!result.valid || capabilities === undefined) return result;
    const problems = capabilityProblems(
      current,
      { ...current, uischema: result.value },
      capabilities,
    );
    return problems.length === 0 ? result : { valid: false, problems };
  };
}

/**
 * The same for the Schema half.
 *
 * A schema edit is not obviously a capability question, but it is: an inspector field reads the bound
 * PROPERTY (`Required`, `Min length`, the choice options), so retyping a property in this pane changes
 * exactly the settings `edit` names. Gating only the uischema would leave that door open.
 */
export function governedSchemaValidator(
  current: EditableDocument,
  capabilities: CapabilityMap | undefined,
): (value: unknown) => DocumentCheck<JsonSchema> {
  return (value) => {
    const result = validateSchemaDocument(value);
    if (!result.valid || capabilities === undefined) return result;
    const problems = capabilityProblems(
      current,
      { ...current, schema: result.value },
      capabilities,
    );
    return problems.length === 0 ? result : { valid: false, problems };
  };
}
