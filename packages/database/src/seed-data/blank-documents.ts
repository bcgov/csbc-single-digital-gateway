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
