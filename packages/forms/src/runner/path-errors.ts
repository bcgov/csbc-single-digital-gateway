import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { drawnNodes } from '../renderers/xyflow/flow-elements';
import { formHasError, unownedErrors, type FormValidationError } from './form-errors';
import { navigableStage, stageFormsOf, type RunnerPosition } from './runner-position';

// Which Forms on the citizen's PATH have errors, and what Submit should do about them (doc 202 rules 27b-27d). PURE —
// no React — like `form-errors`, which it builds on.

/** The key a Form is addressed by in error sets: its Stage and Form ids. */
export const formKey = ({ stageId, formId }: RunnerPosition): string => `${stageId}/${formId}`;

/** One Form on the path, in the order the citizen meets it. */
export interface PathForm extends RunnerPosition {
  readonly element: UISchemaElement;
}

/** The Forms of `stageIds`, in stage order then Form order. */
export function pathForms(flow: UISchemaElement, stageIds: readonly string[]): PathForm[] {
  return stageIds.flatMap((stageId) => {
    const stage = navigableStage(flow, stageId);
    return stage === undefined
      ? []
      : stageFormsOf(stage).map((form) => ({ stageId, formId: form.id, element: form.element }));
  });
}

/** Every Form of every Stage in the Flow, on the path or not. */
const allForms = (flow: UISchemaElement): UISchemaElement[] =>
  drawnNodes(flow).flatMap((node) =>
    node.kind === 'stage' ? stageFormsOf(node.element).map((form) => form.element) : [],
  );

export interface PathErrors {
  /** Every Form on the path, in path order. */
  readonly forms: readonly PathForm[];
  /** `formKey`s of the path Forms owning at least one error. */
  readonly erroredForms: ReadonlySet<string>;
  /** The first such Form in path order — where Submit sends the citizen (rule 27c). */
  readonly firstError: PathForm | undefined;
  /** Whether Submit is refused at all (rule 27b). */
  readonly submitBlocked: boolean;
}

/**
 * Rule 27b: Submit is blocked by an error on a Form ON THE PATH, or by an error NO Form owns (rule 32). An error owned
 * only by a Form off the path — a required field on the branch not taken — blocks nothing: the citizen can never
 * reach that Form, so blocking on it would leave them stuck with no way to fix it. (Superseding rule 27's "any error
 * in the document", which predates branching.)
 */
export function pathErrors(
  flow: UISchemaElement,
  stageIds: readonly string[],
  schema: JsonSchema,
  errors: readonly FormValidationError[],
): PathErrors {
  if (errors.length === 0) {
    return {
      forms: pathForms(flow, stageIds),
      erroredForms: new Set(),
      firstError: undefined,
      submitBlocked: false,
    };
  }
  const onPath = pathForms(flow, stageIds);
  const errored = onPath.filter((form) => formHasError(form.element, schema, errors));
  return {
    forms: onPath,
    erroredForms: new Set(errored.map(formKey)),
    firstError: errored[0],
    submitBlocked: errored.length > 0 || unownedErrors(allForms(flow), schema, errors).length > 0,
  };
}

/**
 * Rule 24b: whether the rail may open `target` from `position`. Moving BACK (or staying) is always allowed. Moving
 * FORWARD is allowed only while no Form from the one on screen up to (not including) `target` has an error, the same
 * check Next makes one step at a time. So a required field cannot be skipped by clicking a later page or stage:
 * "if a field is required, it's required". A target not on the path is left to the caller (the rail lists none).
 */
export function mayOpen(
  errors: Pick<PathErrors, 'forms' | 'erroredForms'>,
  position: RunnerPosition | null,
  target: RunnerPosition,
): boolean {
  const keys = errors.forms.map(formKey);
  const to = keys.indexOf(formKey(target));
  const from = position === null ? 0 : keys.indexOf(formKey(position));
  if (to === -1 || from === -1 || to <= from) return true;
  return !keys.slice(from, to).some((key) => errors.erroredForms.has(key));
}
