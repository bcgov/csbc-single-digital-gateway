// `@repo/documents/content` (doc 275): the document content model, PURE — no React, no JSONForms — so the Nest apps
// and the web apps read and write one shape: `{ schema, variants: { default, …others }, capabilities? }`.
export {
  blankContent,
  defaultLabel,
  DEFAULT_VARIANT,
  DOCUMENT_KINDS,
  DOCUMENT_TYPES,
  documentContentOf,
  variantNames,
  variantOf,
  withDefaultLabel,
  withTitle,
  withVariant,
  type DocumentContent,
  type DocumentKind,
  type DocumentType,
  type Uischema,
} from './studio/document-types';
export {
  variantProblems,
  type MissingField,
  type VariantProblem,
} from './studio/variants/variant-problems';
export type { CapabilityMap } from './studio/capabilities/capability-types';
