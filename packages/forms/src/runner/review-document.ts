import type { UISchemaElement } from '@jsonforms/core';
import { labelOf } from '../renderers/gridstack/element-label';
import { formDescriptionOf } from '../renderers/gridstack/form-renderer';
import { FORM_TYPE, SECTION_TYPE } from '../renderers/gridstack/grid-layouts';
import { navigableStage, stageFormsOf } from './runner-position';

// The review page as ONE document (doc 213): the projected path turned into a `Form` whose children are a
// `Section` per Form of that path.
//
// The page used to be ASSEMBLED — one `<JsonForms>` per Form, under a hand-built title bar — for a single
// reason: a `Form` may not nest (doc 192 rule 5), so no legal document could hold the whole path. Doc 212's
// `Section` is that missing piece, and it is a faithful stand-in rather than an approximation: it carries the
// same `label` and the same rich `options.description`, and it is the same layout KIND, so every child of a
// Form is legal in the Section that replaces it with nothing re-validated or rewritten.
//
// PURE and React-free. What is drawn, and read-only or plain, is `runner-review.tsx`'s business.

/** Doc 202 rule 51, unchanged: the heading a Flow with no name of its own gets. */
export const REVIEW_TITLE = 'Review your answers';

/**
 * Rules 1-7: the projected path as one `Form`.
 *
 * `stageIds` is doc 202 rule 49's list — the PROJECTED path, never the `visited` set. Change an answer late
 * and a stage the citizen visited may no longer be on their branch, so reviewing it would show them data they
 * are not submitting.
 *
 * NOTHING HERE IS INVENTED. Every value comes from the document: the title from the Flow's own label (falling
 * back to `REVIEW_TITLE`, which is a name for a page rather than content), each Section's heading and
 * description from the Form it stands for, and each Section's children from that Form by reference. The one
 * thing that was never authored — doc 202's plain-text description fallback — is dropped rather than
 * fabricated into a Lexical state (rule 6).
 */
export function reviewDocument(
  flow: UISchemaElement,
  stageIds: readonly string[],
): UISchemaElement {
  const description = formDescriptionOf(flow);

  const elements = stageIds.flatMap((stageId) => {
    const stage = navigableStage(flow, stageId);
    // Rule 2: a stage that resolves to nothing, or holds no Form, contributes no Section — the same walk the
    // page did when it mounted one `<JsonForms>` per Form.
    return stage === undefined ? [] : stageFormsOf(stage).map(({ element }) => sectionFor(element));
  });

  return {
    type: FORM_TYPE,
    label: labelOf(flow, REVIEW_TITLE),
    // `exactOptionalPropertyTypes`: an absent description must be an ABSENT KEY, never `undefined`.
    ...(description === undefined ? {} : { options: { description } }),
    elements,
  } as unknown as UISchemaElement;
}

/**
 * Rules 3-4: one path Form as a Section.
 *
 * `label` and `options.description` are the same shape on both types (doc 212 rules 1, 3), so this is a rename
 * of the wrapper rather than a conversion of the content. `elements` crosses BY REFERENCE: the synthesis never
 * copies or rewrites a child, so a document with a thousand fields costs one array per Section.
 *
 * `options.id` is deliberately NOT carried across. A Form's id addresses it for focus deep linking (doc 197);
 * a Section has no identity, and a review page is not somewhere anything is addressed.
 *
 * No `variant`, `gap` or `inset` is authored either (rule 18) — the review page is a document, not a stack of
 * panels, so every Section default applies.
 */
function sectionFor(form: UISchemaElement): UISchemaElement {
  const label = labelOf(form, '');
  const description = formDescriptionOf(form);

  return {
    type: SECTION_TYPE,
    ...(label === '' ? {} : { label }),
    ...(description === undefined ? {} : { options: { description } }),
    elements: (form as unknown as { elements?: readonly UISchemaElement[] }).elements ?? [],
  } as unknown as UISchemaElement;
}
