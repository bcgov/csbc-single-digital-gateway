import { and, optionIs, rankWith, schemaMatches, uiTypeIs } from '@jsonforms/core';
import { documentReferenceControlEntry } from '../ui/document-reference-control';
import { DOCUMENT_REFERENCE_COMPONENT } from '../ui/document-reference';
import { isObjectArray } from '../ui/object-array';

/**
 * Outranks the studio data table (rank 2, any object array) and the inert-wrapped ui control it reuses (doc 287 rule
 * 12). Wrapped inert, so it is a preview on an authoring canvas and live on a fillable one (doc 281 rule 4).
 */
export const studioDocumentReferenceTester = rankWith(
  3,
  and(
    uiTypeIs('Control'),
    optionIs('component', DOCUMENT_REFERENCE_COMPONENT),
    schemaMatches((schema) => isObjectArray(schema)),
  ),
);

export const studioDocumentReferenceEntry = {
  tester: studioDocumentReferenceTester,
  renderer: documentReferenceControlEntry.renderer,
};
