// Public API for @repo/react/jsonforms.
export { JsonForms } from './json-forms';
export type { JsonFormsProps } from './json-forms';

// Convenience re-exports of the core JSONForms types consumers need when authoring
// schemas and reading form state — so they need not depend on @jsonforms/core directly.
export type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsCore,
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
  ValidationMode,
} from '@jsonforms/core';
