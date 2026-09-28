/**
 * The `content` of each seeded TEMPLATE version (feature 217) — a `@repo/forms` `StudioDocument`,
 * `{ schema, uischema }` (see `packages/forms/src/types/index.ts`).
 *
 * The label MUST live at `uischema.label`: `document_versions.title` is GENERATED from
 * `content -> 'uischema' ->> 'label'`, so that is the only path the column reads.
 *
 * `options.description` is deliberately NOT set. `@repo/forms` types it as a Lexical editor state
 * (a rich object), and `->>` over a JSON object yields NULL — a description written here as a plain
 * string would be the wrong shape for the studio AND would still leave the generated `description`
 * column NULL. Descriptions are authored in the studio, as rich content.
 *
 * `elements: []` is required — `FormElement` and `ServiceElement` both extend `Layout`.
 *
 * Typed as plain object literals rather than importing `@repo/forms`: this package is CJS-agnostic
 * infrastructure with no React/forms dependency, and the shapes are pinned by the studio's
 * metaschema on the way in.
 */

import { DOCUMENT_TYPE, type DocumentType } from '../schema/documents';

const blankSchema = { type: 'object', properties: {}, required: [] } as const;

/** A service — the root-only `Service` boundary (doc 215). */
export const blankServiceContent = {
  schema: blankSchema,
  uischema: { type: 'Service', label: 'Service', elements: [] },
};

/** A way to apply — one `Form` today; an author may replace the root with a `Flow` for stages. */
export const blankApplicationMethodContent = {
  schema: blankSchema,
  uischema: { type: 'Form', label: 'Application method', elements: [] },
};

/** A consent document the citizen approves or rejects before applying. */
export const blankServiceAgreementContent = {
  schema: blankSchema,
  uischema: { type: 'Form', label: 'Service agreement', elements: [] },
};

/**
 * The blank content a NEW template of each type starts from (doc 227): the seed's three templates
 * and an admin's "New template" share it, so both begin from the same shape.
 */
const BLANK_CONTENT = {
  [DOCUMENT_TYPE.service]: blankServiceContent,
  [DOCUMENT_TYPE.applicationMethod]: blankApplicationMethodContent,
  [DOCUMENT_TYPE.serviceAgreement]: blankServiceAgreementContent,
} satisfies Record<DocumentType, unknown>;

/** A fresh copy of `type`'s blank `{ schema, uischema }`, safe for the caller to modify. */
export function blankContentFor(type: DocumentType): {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
} {
  return structuredClone(BLANK_CONTENT[type]) as {
    schema: Record<string, unknown>;
    uischema: Record<string, unknown>;
  };
}
