// The form runner (doc 202) — `@repo/forms/runner`.
//
// `<FormRunner>` is the host-mounted entry point: it mounts one `<JsonForms>` over the whole document with
// `renderers/default`, owns the position and the visited set, and renders the action bar. Everything else here is
// either the port the Flow renderer entry reads, or a pure module a test can exercise without mounting a form.

export { FormRunner, ROOT_MESSAGE } from './form-runner';
export { RunnerProvider, useRunner, type RunnerPort } from './runner-context';
export { RunnerActions, type RunnerActionsProps } from './runner-actions';
export {
  RunnerSidebar,
  RunnerStageIndicator,
  sidebarStages,
  type RunnerSidebarProps,
  type SidebarStage,
} from './runner-sidebar';
export { SubmissionPreview, submissionPayload } from './submission-preview';
// Doc 211: the fill side's second entry point — the same document, shown as answers.
export { SubmissionView } from './submission-view';
export { RunnerReview, REVIEW_TITLE } from './runner-review';
// Doc 213: the pure transform behind the review page, exported for a host that wants the whole submission
// as one document without the runner around it.
export { reviewDocument } from './review-document';

export {
  conditionEdge,
  criterionFieldOf,
  firstMatchingRow,
  matchesClause,
  matchesRow,
  type ConditionRoute,
  type RunnerData,
} from './criterion-match';

export {
  documentHasError,
  errorPropertyKey,
  formHasError,
  formOwnedErrors,
  unownedErrors,
  type FormValidationError,
} from './form-errors';

export {
  firstPositionIn,
  isFinalStep,
  isNavigableStage,
  navigableStage,
  nextStageId,
  nextStep,
  stageFormsOf,
  startPosition,
  visitedWith,
  type RunnerFlow,
  type RunnerPosition,
  type RunnerStep,
  type StageForm,
} from './runner-position';
