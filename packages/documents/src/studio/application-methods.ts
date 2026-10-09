import {
  isDocumentReferenceUischema,
  referencesOf,
  referenceTypeOf,
} from '../renderers/ui/document-reference';
import { type DocumentContent, type DocumentType, variantOf } from './document-types';
import { controlsOf, keyOfScope } from './variants/variant-bindings';

/** One document a version references: the field holding it, the field's document type, and the target id. */
export interface DocumentLink {
  fieldKey: string;
  targetType: DocumentType;
  targetId: string;
}

/**
 * Doc 290 rule 1: every document a version references — the ids stored under each DEFAULT-variant document reference
 * (doc 287) with a known document type, every Form of a Funnel included, in reading order, each (field, id) once. The
 * ONE reader of a version's references: `document_links` is rebuilt from it, and `applicationMethodIds` filters it.
 */
export function documentLinks(content: DocumentContent): DocumentLink[] {
  const seen = new Set<string>();
  return controlsOf(variantOf(content)).flatMap((control) => {
    const fieldKey = keyOfScope(control['scope']);
    const targetType = referenceTypeOf(control);
    if (!isDocumentReferenceUischema(control) || fieldKey === undefined || targetType === undefined)
      return [];
    return referencesOf(content.data?.[fieldKey]).flatMap(({ id }) => {
      const key = `${fieldKey}\u0000${id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ fieldKey, targetType, targetId: id }];
    });
  });
}

/**
 * Doc 289 rule 1: the application methods a service version references, in reading order and each once — the
 * application-method links of `documentLinks`. The reader for the precheck, publish, new version, discard and the
 * method read (doc 289 contract 1).
 */
export function applicationMethodIds(content: DocumentContent): string[] {
  const ids = documentLinks(content)
    .filter((link) => link.targetType === 'services.service-application-method')
    .map((link) => link.targetId);
  return [...new Set(ids)];
}
