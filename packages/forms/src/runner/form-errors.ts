import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

import { propertyKeysUsed } from '../renderers/ui/schema-properties';

// Which of the document's Ajv errors belong to one Form (doc 202 rules 29-33).
//
// PURE — no React, nothing from `@jsonforms/*` at runtime (the `import type` above erases). That is
// load-bearing twice over: `renderers/default` imports this module and a test pins that it drags no
// renderer or React dependency behind it (doc 202 rule 42, the same discipline as doc 195 rule 5),
// and every rule here is testable without mounting a form.
//
// WHY THIS MODULE EXISTS AT ALL. The runner mounts ONE `<JsonForms>` over the WHOLE document
// (doc 202 rule 5), so Ajv validates every Form at once — including Forms the user has not reached
// yet. Next is gated on the CURRENT Form's own errors (rule 24) and Submit on the document's
// (rule 27), so each error has to be attributed back to the Form that owns it.
//
// THE TRAP (doc 202 rule 31). A missing top-level required field reports `instancePath: ''` and
// names the field in `params.missingProperty` — verified against JSONForms' own `createAjv`:
//
//   MISSING REQUIRED  {}            -> { instancePath: '',   keyword: 'required',  params: { missingProperty: 'a' } }
//   TOO LONG          {a: 'abc'}    -> { instancePath: '/a', keyword: 'maxLength', params: { limit: 2 } }
//   NUMBER MIN        {a:'ok',b:1}  -> { instancePath: '/b', keyword: 'minimum',   params: { limit: 5 } }
//
// `@repo/react`'s `stepOwnsError` matches by bidirectional prefix overlap of path segments and
// returns false on zero shared segments. That is safe THERE only because its scopes are nested
// (`/details/faq`), so a `required` error still lands on the parent object's path. Ours are
// top-level (doc 185 rules 17-18): an empty `instancePath` overlaps nothing, so every `required`
// error would be owned by no Form at all and Next would never be blocked by a missing required
// field — the commonest error a form can have. Hence: for `keyword: 'required'` at the root,
// attribute by `params.missingProperty`; otherwise by the FIRST segment of `instancePath`
// (rule 30).
//
// DEPENDENCY WORTH KNOWING (doc 202 rule 33). Ajv counts `''` as PRESENT, so a `required` check
// PASSES for an empty string. The gate is therefore only as good as doc 182's rule that the
// package's controls write `undefined` — never `''` or `null` — for an empty value; a control
// regressing to `''` would silently open the Next gate. A runner-level test pins that.

/**
 * The shape of one Ajv error this module reads.
 *
 * Typed STRUCTURALLY rather than as Ajv's `ErrorObject`, following the precedent of `FlowError` in
 * `@repo/react`'s flow `model.ts`: the module stays dependency-light, and a test can hand it plain
 * object literals without compiling a schema or mounting a form. Every field is `unknown` and
 * normalised below — errors arrive from a validator the host configured, so nothing is trusted.
 */
export interface FormValidationError {
  instancePath?: unknown;
  keyword?: unknown;
  params?: unknown;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * The top-level property key an error is attributed to, or `undefined` when it names none.
 *
 * Two shapes, and only two (doc 202 rules 30-31):
 *
 * - A non-empty `instancePath` — its FIRST segment. `/b` → `b`, and `/items/0/name` → `items`,
 *   because a Control bound to `#/properties/items` owns everything raised beneath it.
 * - An empty `instancePath` with `keyword: 'required'` — `params.missingProperty`. The absent
 *   property has no path of its own, so Ajv reports the error against the containing object, which
 *   at the root is `''`.
 *
 * Anything else — an `additionalProperties` failure, a root keyword such as `minProperties` naming
 * no single key — deliberately returns `undefined`. It is owned by no Form and blocks Next nowhere
 * (rule 32); {@link documentHasError} still blocks Submit on it.
 */
export function errorPropertyKey(error: FormValidationError): string | undefined {
  const instancePath = typeof error.instancePath === 'string' ? error.instancePath : '';

  if (instancePath !== '') {
    // `''.split('/')` and a leading `/` both yield empty segments; take the first non-empty one.
    const first = instancePath.split('/').find((segment) => segment !== '');
    return first === undefined || first === '' ? undefined : first;
  }

  if (error.keyword !== 'required') return undefined;

  const missing = asRecord(error.params).missingProperty;
  return typeof missing === 'string' && missing !== '' ? missing : undefined;
}

/**
 * The errors owned by one Form element: those whose attributed property key is one of the top-level
 * keys the Form's Controls bind (doc 202 rule 29, via `propertyKeysUsed` — never reimplemented
 * here, so dispatch and gating can never disagree about what a Control binds to).
 *
 * A Form with no Controls owns nothing, so its Next is never blocked — correct: it has no field to
 * be wrong.
 */
export function formOwnedErrors(
  form: UISchemaElement,
  schema: JsonSchema,
  errors: readonly FormValidationError[],
): FormValidationError[] {
  if (errors.length === 0) return [];
  const keys = propertyKeysUsed(form, schema);
  if (keys.size === 0) return [];
  return errors.filter((error) => {
    const key = errorPropertyKey(error);
    return key !== undefined && keys.has(key);
  });
}

/**
 * Whether a Form owns at least one error — the Next gate (doc 202 rule 24).
 *
 * Short-circuits rather than materialising the list, since this runs on every keystroke of a live
 * `<JsonForms>`.
 */
export function formHasError(
  form: UISchemaElement,
  schema: JsonSchema,
  errors: readonly FormValidationError[],
): boolean {
  if (errors.length === 0) return false;
  const keys = propertyKeysUsed(form, schema);
  if (keys.size === 0) return false;
  return errors.some((error) => {
    const key = errorPropertyKey(error);
    return key !== undefined && keys.has(key);
  });
}

/**
 * Whether the document has ANY error — the Submit gate (doc 202 rule 27).
 *
 * Deliberately NOT "any error owned by some Form": an error owned by no Form (rule 32) blocks Next
 * nowhere, but it must still block Submit, or an `additionalProperties` failure would be submitted
 * silently with no gate having looked at it. So this asks nothing about ownership — presence of any
 * error is the whole rule, and the function exists to say so at the call site rather than leaving a
 * bare `errors.length > 0` for a later reader to "tighten" into an ownership filter.
 */
export function documentHasError(errors: readonly FormValidationError[]): boolean {
  return errors.length > 0;
}

/**
 * The errors owned by NO Form in `forms` (doc 202 rule 32) — the gap between the two gates.
 *
 * Not needed to gate anything (Submit already blocks on {@link documentHasError}), but it is what a
 * diagnostic or a test asserts on: it names exactly the errors a user can neither see attributed
 * nor navigate to, which is the failure mode rule 32 accepts and asks not to hide.
 */
export function unownedErrors(
  forms: readonly UISchemaElement[],
  schema: JsonSchema,
  errors: readonly FormValidationError[],
): FormValidationError[] {
  if (errors.length === 0) return [];
  const owned = new Set<string>();
  for (const form of forms) for (const key of propertyKeysUsed(form, schema)) owned.add(key);
  return errors.filter((error) => {
    const key = errorPropertyKey(error);
    return key === undefined || !owned.has(key);
  });
}
