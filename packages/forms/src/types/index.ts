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

/**
 * Props accepted by `FormStudio` (doc 183 rules 1-3, doc 197 rules 7-8): the form to open, and — optionally — where
 * focus is. `schema` / `uischema` seed the studio's own state; passing a different object resets the studio to it.
 * There is no document change callback: the studio owns the document.
 *
 * `focusedForm` / `onFocusedFormChange` let a host put the drilled-in Form in a URL without the studio knowing anything
 * about routing. Both are optional and independent: with neither passed, focus stays internal exactly as before.
 */
export type FormStudioProps = {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
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
