/**
 * Public types for `@repo/forms` (docs 178, 180, 182).
 *
 * This module is the package root entry (`@repo/forms`) and is deliberately types-only —
 * components are reached through their own submodule subpath (`@repo/forms/studio`,
 * `@repo/forms/renderers/ui`, …).
 */

import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

export type { RendererSet } from './renderer-set';
export type {
  CheckboxControlElement,
  ComboboxControlElement,
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
  RadioGroupControlElement,
  SwitchControlElement,
  TextareaControlElement,
  VerticalLayoutElement,
} from './elements';

/**
 * Props accepted by `FormStudio` (doc 183 rules 1-3): the form to open. Both are optional — the studio
 * falls back to its built-in sample — and seed the studio's own state; passing a different object
 * resets the studio to it. There is no change callback: the studio owns the document.
 */
export type FormStudioProps = {
  schema?: JsonSchema | undefined;
  uischema?: UISchemaElement | undefined;
};
