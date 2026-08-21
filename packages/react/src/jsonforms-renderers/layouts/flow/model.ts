import { collectScopes, scopePath, type UiElement } from '../../../uischema-edit';

/**
 * Shared model for the Categorization "flow" layout (feature 176). One source of truth for step
 * derivation, the `options.variant` discriminator, and the mapping from Ajv errors to a per-step
 * status.
 *
 * **This file imports no React and nothing from `@jsonforms/*` at runtime** — only a type-free pair
 * of helpers from `uischema-edit`. That is deliberate: every rule here is testable without mounting
 * a form, and the renderer is left holding nothing but presentation.
 *
 * Everything reads a JSONB blob that was copied from a document-type template, so per the project's
 * normalize-before-use rule every accessor coerces rather than trusts. A malformed `elements`,
 * a non-string `label` or a junk `options` degrades to a safe default; nothing here throws on the
 * render path.
 */

/** The uischema `options.variant` value this layout claims. Anything else falls through to tabs. */
export const FLOW_VARIANT = 'flow';

/** One derived step: a `Category` child of the Categorization. */
export interface FlowStep {
  /** The authored `label`, or `''` when absent/malformed. */
  label: string;
  /** The authored `options.description`, or `''` when absent/malformed. */
  description: string;
  /** The category's own child elements, dispatched into the content pane. */
  elements: UiElement[];
}

/**
 * `current` — the step being shown.
 * `upcoming` — after the current step; never flagged, however invalid it is.
 * `valid` / `invalid` — before the current step, by real validity.
 */
export type FlowStepStatus = 'current' | 'upcoming' | 'valid' | 'invalid';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const childrenOf = (value: unknown): UiElement[] => {
  const elements = asRecord(value).elements;
  return Array.isArray(elements) ? (elements as UiElement[]) : [];
};

/**
 * True when this element opts into the flow presentation.
 *
 * Checked as an exact match on a normalized string, so `'stepper'` (JSONForms' own Material variant)
 * and every other value fall through to the rank-1 tabs renderer — as does the overwhelmingly common
 * case of a Categorization with no `options` at all.
 */
export function isFlowVariant(uischema: unknown): boolean {
  return asText(asRecord(asRecord(uischema).options).variant) === FLOW_VARIANT;
}

/**
 * The direct `Category` children, in document order.
 *
 * Non-Category children are dropped — the same filter the tabs renderer applies, so switching
 * variants can never change which children are reachable. A nested `Categorization` is only rendered
 * when it is wrapped in a `Category`, where its own renderer picks it up recursively.
 */
export function categoriesOf(uischema: unknown): FlowStep[] {
  return childrenOf(uischema)
    .filter((element) => asRecord(element).type === 'Category')
    .map((category) => ({
      label: asText(asRecord(category).label),
      description: asText(asRecord(asRecord(category).options).description),
      elements: childrenOf(category),
    }));
}

/** The `instancePath` of one Ajv error — the only field of an error this model reads. */
export interface FlowError {
  instancePath?: unknown;
}

/**
 * `'/details/faq/0/question'` → `['details','faq','0','question']`. Mirrors {@link scopePath}'s
 * output shape so the two can be compared segment-wise.
 */
function instancePathSegments(instancePath: unknown): string[] {
  return typeof instancePath === 'string'
    ? instancePath.split('/').filter((segment) => segment !== '')
    : [];
}

/** True when `a` is a prefix of `b`, or `b` a prefix of `a`. */
const overlaps = (a: readonly string[], b: readonly string[]): boolean => {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return shared > 0;
};

/**
 * Whether a step owns at least one of `errors`.
 *
 * Matching is **bidirectional prefix**, not equality, and that is load-bearing in both directions:
 *
 * - The error can be DEEPER than the scope — a control bound to `#/properties/details/properties/faq`
 *   owns `/details/faq/0/question`, an error raised inside an array item.
 * - The error can be SHALLOWER than the scope — Ajv reports a missing required property against the
 *   PARENT object (`/details` with `params.missingProperty: 'faq'`), not against the absent child.
 *   Requiring the error to be at or below the scope would silently drop every `required` error,
 *   which is the most common failure a step can have.
 *
 * An error whose path overlaps nothing in any step (a root-level `required`, an
 * `additionalProperties`) is owned by no step. Blaming an arbitrary step for a document-level error
 * is worse than showing none.
 */
export function stepOwnsError(step: FlowStep, errors: readonly FlowError[]): boolean {
  const paths = collectScopes(step.elements).map(scopePath);
  if (paths.length === 0 || errors.length === 0) {
    return false;
  }
  return errors.some((error) => {
    const segments = instancePathSegments(error.instancePath);
    return paths.some((path) => overlaps(path, segments));
  });
}

/** Clamp a step index into `[0, steps.length - 1]`, or `0` when there are no steps. */
export function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount <= 0) {
    return 0;
  }
  if (!Number.isFinite(index)) {
    return 0;
  }
  return Math.min(Math.max(Math.trunc(index), 0), stepCount - 1);
}

/**
 * The status of every step, given the current index and the live Ajv errors.
 *
 * **Status is resolved by INDEX, not by visit history.** Jumping from the rail straight to step 4
 * immediately reports the real validity of steps 1–3 rather than leaving them neutral because the
 * session happened not to pass through them — the rail describes the document, not the session.
 */
export function stepStatuses(
  steps: readonly FlowStep[],
  current: number,
  errors: readonly FlowError[],
): FlowStepStatus[] {
  const active = clampStepIndex(current, steps.length);
  return steps.map((step, index) => {
    if (index === active) {
      return 'current';
    }
    if (index > active) {
      return 'upcoming';
    }
    return stepOwnsError(step, errors) ? 'invalid' : 'valid';
  });
}
