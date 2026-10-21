/**
 * The `content` of each seeded TEMPLATE version — a `@repo/documents` `DocumentContent` (doc 275),
 * `{ schema, variants: { default: <uischema> } }`. Every type starts as a `Form`; any of them may become a `Funnel`
 * of Forms (the API allows either root for every type).
 *
 * The label MUST live at `variants.default.label`: `document_versions.title` is GENERATED from
 * `content -> 'variants' -> 'default' ->> 'label'`, so that is the only path the column reads.
 *
 * `options.description` is deliberately NOT set: it is rich content (a Lexical state), and `->>` over a
 * JSON object yields NULL. Descriptions are authored in the studio.
 *
 * Each root carries a fixed 8-character `id` (the studio addresses elements by id; it stamps any that
 * are missing on load, but a seed should be deterministic).
 *
 * Typed as plain object literals rather than importing `@repo/documents`: this package is
 * infrastructure with no React dependency.
 */

import { DOCUMENT_TYPE, type DocumentType } from '../schema/documents';

const blankSchema = { type: 'object', properties: {}, required: [] } as const;

const blankForm = (id: string, label: string) => ({
  schema: blankSchema,
  variants: { default: { id, type: 'Form', label, elements: [] } },
});

/** A service. */
export const blankServiceContent = blankForm('tmplSvc1', 'Service');

/** A way to apply. */
export const blankApplicationMethodContent = blankForm('tmplApp1', 'Application method');

/** A consent document the citizen approves or rejects before applying. */
export const blankServiceAgreementContent = blankForm('tmplAgr1', 'Service agreement');

/**
 * The blank content a NEW template of each type starts from (doc 227): the seed's three templates
 * and an admin's "New template" share it, so both begin from the same shape.
 */
const BLANK_CONTENT = {
  [DOCUMENT_TYPE.service]: blankServiceContent,
  [DOCUMENT_TYPE.applicationMethod]: blankApplicationMethodContent,
  [DOCUMENT_TYPE.serviceAgreement]: blankServiceAgreementContent,
} satisfies Record<DocumentType, unknown>;

/** The shape of `blankContentFor`'s result. */
export interface BlankContent {
  schema: Record<string, unknown>;
  variants: { default: Record<string, unknown> } & Record<string, Record<string, unknown>>;
}

/** A fresh copy of `type`'s blank `{ schema, variants }`, safe for the caller to modify. */
export function blankContentFor(type: DocumentType): BlankContent {
  return structuredClone(BLANK_CONTENT[type]) as BlankContent;
}
