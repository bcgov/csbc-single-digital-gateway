import { referenceTypeOf } from '../../renderers/ui/document-reference';
import { answersOf, withAnswers } from '../answers/answer-edits';
import { DOCUMENT_TYPE_INFO, DOCUMENT_TYPES, type DocumentContent } from '../document-types';
import type { PropertyRef } from '../property-ref';
import { choice, isKind, type InspectorField } from './inspector-field';
import { refOf } from './inspector-target';
import { cascadeOption } from './option-cascade';

/** `content` without the answer to a page property — references of the old type would point at the wrong documents. */
function clearAnswer(content: DocumentContent, ref: PropertyRef): DocumentContent {
  const answers = answersOf(content);
  if (ref.array !== undefined || !Object.hasOwn(answers, ref.key)) return content;
  const { [ref.key]: _cleared, ...rest } = answers;
  return withAnswers(content, rest);
}

/**
 * Doc 287 rule 15: which documents a reference points at. Always valued; DEFAULT-ONLY (doc 262's schema lock, since
 * the type says what the stored ids MEAN), cascaded to every Control on the property in every variant, and a change
 * clears the property's answer.
 */
export const documentTypeField: InspectorField = {
  key: 'documentType',
  section: 'General',
  label: 'Document type',
  applies: isKind('document-reference'),
  schema: () =>
    choice(DOCUMENT_TYPES.map((type) => [type, DOCUMENT_TYPE_INFO[type].label] as const)),
  required: true,
  read: (t) => referenceTypeOf(t.element),
  write: (content, t, value) => {
    if (t.property === undefined || typeof value !== 'string') return content;
    if (value === referenceTypeOf(t.element)) return content;
    const ref = refOf(t.property);
    return clearAnswer(cascadeOption(content, ref, 'documentType', value), ref);
  },
  schemaLevel: true,
};
