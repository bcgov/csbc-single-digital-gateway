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
  ConditionElement,
  Criterion,
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
  SeparatorElement,
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
 * Props accepted by `FormStudio` (doc 183 rules 1-3, doc 197 rules 7-8, doc 200 rules 1-3): the form to open, where
 * focus is, and how a document arrives and leaves.
 *
 * The studio owns the document *while it is edited* — every drag, inspector edit and code-editor apply is its own
 * state — but it no longer originates one. With no `schema`/`uischema` and no `loadDocument`, it opens the New form
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
   * Called with the current document when the author saves (doc 200 rule 22). Accepting this prop is what makes
   * persistence an addition rather than a redesign; nothing in the studio writes to an API today.
   */
  onSaveDocument?: ((document: StudioDocument) => void | Promise<void>) | undefined;
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
};
