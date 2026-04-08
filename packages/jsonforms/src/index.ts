import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
} from "@jsonforms/core";
import Ajv from "ajv";

import {
  inputControlEntry,
  numberControlEntry,
  integerControlEntry,
  booleanControlEntry,
  enumControlEntry,
  oneOfEnumControlEntry,
  oneOfControlEntry,
  multiLineControlEntry,
  dateControlEntry,
  jsonControlEntry,
  richTextControlEntry,
  asyncSelectControlEntry,
  selectControlEntry,
} from "./controls/index.js";
import {
  verticalLayoutEntry,
  horizontalLayoutEntry,
  groupLayoutEntry,
  categorizationLayoutEntry,
  accordionLayoutEntry,
  accordionItemLayoutEntry,
  arrayLayoutEntry,
} from "./layouts/index.js";
import {
  textCellEntry,
  numberCellEntry,
  integerCellEntry,
  booleanCellEntry,
  enumCellEntry,
  dateCellEntry,
} from "./cells/index.js";

export const repoRenderers: JsonFormsRendererRegistryEntry[] = [
  inputControlEntry,
  numberControlEntry,
  integerControlEntry,
  booleanControlEntry,
  enumControlEntry,
  oneOfEnumControlEntry,
  multiLineControlEntry,
  dateControlEntry,
  jsonControlEntry,
  richTextControlEntry,
  asyncSelectControlEntry,
  selectControlEntry,
  oneOfControlEntry,
  verticalLayoutEntry,
  horizontalLayoutEntry,
  groupLayoutEntry,
  categorizationLayoutEntry,
  accordionLayoutEntry,
  accordionItemLayoutEntry,
  arrayLayoutEntry,
];

export const repoCells: JsonFormsCellRendererRegistryEntry[] = [
  textCellEntry,
  numberCellEntry,
  integerCellEntry,
  booleanCellEntry,
  enumCellEntry,
  dateCellEntry,
];

export const repoAjv = new Ajv({ allErrors: true });

const defaultsAjv = new Ajv({ useDefaults: true });

/**
 * Apply JSON Schema `default` values to a data object (one-time, returns a new object).
 * Use this to initialise form data before passing it to JsonForms.
 */
export function applySchemaDefaults<T>(
  schema: Record<string, unknown>,
  data: T,
): T {
  const clone = structuredClone(data);
  defaultsAjv.validate(schema, clone);
  return clone as T;
}

// Re-export individual components for customization
export * from "./controls/index.js";
export * from "./layouts/index.js";
export * from "./cells/index.js";
export { FieldWrapper } from "./util/FieldWrapper.js";
