/**
 * Public types for `@repo/forms` (docs 178, 180, 182).
 *
 * This module is the package root entry (`@repo/forms`) and is deliberately types-only —
 * components are reached through their own submodule subpath (`@repo/forms/studio`,
 * `@repo/forms/renderers/ui`, …).
 */

import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

export type { RendererSet } from './renderer-set';
export type { LayoutGap } from '../renderers/gridstack/layout-gap';
export type {
  CheckboxControlElement,
  ComboboxControlElement,
  Clause,
  ConditionElement,
  ConditionRow,
  FlowEdge,
  FlowElement,
  FormElement,
  GridElement,
  GridElementOptions,
  GridItemPlacement,
  GridRenderersOptions,
  GridStackLayoutOptions,
  HeadingElement,
  HorizontalLayoutElement,
  HorizontalLayoutOptions,
  InputControlElement,
  NumberInputControlElement,
  Operator,
  PaletteEmptyElement,
  PaletteGroupElement,
  PaletteItemElement,
  RadioGroupControlElement,
  SectionElement,
  SeparatorElement,
  ServiceElement,
  StageElement,
  StagePosition,
  SwitchControlElement,
  TextareaControlElement,
  VerticalLayoutElement,
} from './elements';

/** A studio document: the two halves `FormStudio` opens, edits and hands back (doc 200 rule 1). */
export type StudioDocument = {
  schema: JsonSchema;
  uischema: UISchemaElement;
};

/**
 * What the New form dialog offers (doc 200 rule 8). `new-*` are blank documents; `template-*` are
 * sample documents that demonstrate each type's features.
 */
export type FormChoice =
  | 'new-multi-stage'
  | 'new-basic'
  | 'template-multi-stage'
  | 'template-basic';

/**
 * Props accepted by `FormRunner` (doc 202 rules 1-4) — the fill side's one entry point, mounted by a host:
 * the citizen portal, where it is the guided application, and platform-web, where it is the studio's preview.
 *
 * `data` is CONTROLLED (rule 3): the host holds the answers and drives its own persistence, which is how the
 * citizen portal already works (an 800ms debounce, then a PATCH). The runner never debounces, and it copies
 * neither the answers nor the graph — it owns only the position and the stages visited.
 *
 * `onSaveDraft` and `onSubmit` are optional and INDEPENDENT (rule 4). An absent handler changes what its button
 * does, never whether the runner works: with no `onSaveDraft` the Save draft button renders disabled (rule 37),
 * and with no `onSubmit` Submit opens a dialog showing the payload that would have been sent (rule 38). With
 * neither, the runner is still fully navigable — which is exactly the studio's preview (rule 39).
 */
export type FormRunnerProps = {
  schema: JsonSchema;
  /** The document to fill in: a `Form` (one form) or a `Flow` (stages). Any other root is refused (rule 6). */
  uischema: UISchemaElement;
  /** The answers. Controlled — the runner renders these and never holds its own copy. */
  data: Record<string, unknown>;
  /** Called with the next answers on every edit. */
  onChange: (data: Record<string, unknown>) => void;
  /** Saves the answers so far. Awaited; a rejection leaves the citizen where they are (rule 36). */
  onSaveDraft?: ((data: Record<string, unknown>) => void | Promise<void>) | undefined;
  /** Submits the answers. Awaited, and gated on the whole document validating (rules 27, 35). */
  onSubmit?: ((data: Record<string, unknown>) => void | Promise<void>) | undefined;
  /**
   * Doc 218 rules 5-9: show the document as a form that CANNOT be filled — a published or archived template, which
   * an author reads rather than answers.
   *
   * Deliberately a MODE of the runner, not a third component: the point is the citizen's real chrome — the stage
   * rail, Back/Next, the action bar — over a document nobody can fill. `SubmissionView` (doc 211) stays what it is,
   * a submission's answers read back, which is not what an empty published template should look like.
   *
   * Controls draw in the `readonly` presentation (doc 202 rule 50), navigation stays free because a document nobody
   * can fill must not gate on emptiness, and Save draft and Submit are both refused — `onSaveDraft` and `onSubmit`
   * are IGNORED while this is set.
   */
  disabled?: boolean | undefined;
};

/**
 * Props accepted by `SubmissionView` (doc 211 rules 14-16): a finished submission and the document it was made
 * on. No callbacks — the component cannot change an answer, save a draft or submit anything, which is the
 * difference between it and `FormRunnerProps` rather than a mode of it.
 */
export type SubmissionViewProps = {
  schema: JsonSchema;
  /** The document the answers were given on: a `Form` or a `Flow`. Any other root is refused (rule 15). */
  uischema: UISchemaElement;
  /** The answers, read and never written. */
  data: Record<string, unknown>;
};

/**
 * Props accepted by `FormStudio` (doc 183 rules 1-3, doc 197 rules 7-8, doc 200 rules 1-3): the form to open, where
 * focus is, and how a document arrives and leaves.
 *
 * The studio owns the document *while it is edited* — every drag, inspector edit and code-editor apply is its own
 * state — but it no longer originates one, and since doc 218 it is OBSERVABLE: `onDocumentChange` reports each
 * document without taking ownership of it. With no `schema`/`uischema` and no `loadDocument`, it opens the New form
 * dialog instead of seeding the built-in sample (doc 200 rule 23).
 *
 * `focusedForm` / `onFocusedFormChange` let a host put the drilled-in Form in a URL without the studio knowing anything
 * about routing. Both are optional and independent: with neither passed, focus stays internal exactly as before.
 */
export type FormStudioProps = {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
  /**
   * Fetches the form to edit (doc 200 rules 1-2, 4-6). Called once per function identity, from an effect, and only
   * when no `schema`/`uischema` is passed — a seeded document always wins. The studio shows its loading state until
   * the promise settles, and its failed state, with a retry, if it rejects.
   */
  loadDocument?: (() => Promise<StudioDocument>) | undefined;
  /**
   * Called with the current document when the author saves (doc 200 rule 22). The studio renders its OWN Save
   * button whenever this is passed, so a host that already has a save affordance of its own (doc 218 rule 14 —
   * the template and agreement detail pages, which alone know about versions, publishing and 409s) should
   * observe `onDocumentChange` instead and leave this absent.
   */
  onSaveDocument?: ((document: StudioDocument) => void | Promise<void>) | undefined;
  /**
   * Doc 218 rules 1-4: called with the current document whenever it changes, and ONCE on mount with the document
   * as opened — that first call is the BASELINE, not an edit, and a host that counts it as a change is dirty from
   * the first paint.
   *
   * An OBSERVER, never a controlled-value channel: the studio still owns the document while it is edited, and
   * feeding a reported document back in as `schema`/`uischema` would reset it. Held in a ref, so an inline arrow
   * is safe here — deliberately unlike `loadDocument`, whose identity IS its re-run signal (doc 200 rule 4b).
   */
  onDocumentChange?: ((document: StudioDocument) => void) | undefined;
  /**
   * The address of the Form to drill into — a Form's authored `options.id` — or `null` for the Flow itself. Only
   * meaningful under a Flow root. An address that names no Form is corrected through `onFocusedFormChange`.
   */
  focusedForm?: string | null | undefined;
  /**
   * Called whenever the focused Form changes, with its address (`null` for the Flow). `replace` is `true` when the
   * studio is correcting an address that never resolved rather than reporting a navigation the author made — a host
   * should replace the history entry in that case, and push in every other.
   */
  onFocusedFormChange?: ((formId: string | null, meta: { replace: boolean }) => void) | undefined;
  /**
   * Doc 209 rules 16-18: called with a short, human message when the studio REFUSES an edit — today, an edge
   * re-point that would duplicate a branch, close a cycle or point a node at itself.
   *
   * A host concern, like `onFocusedFormChange` and `loadDocument`: `@repo/forms` serves two apps with
   * different chrome, and `renderers/` may not import the studio, so a direct toast dependency in this package
   * would be the wrong layer. With no `onNotice` the edit is still refused — it just says nothing (rule 18).
   */
  onNotice?: ((message: string) => void) | undefined;
};
