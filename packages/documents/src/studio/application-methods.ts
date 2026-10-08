import {
  isDocumentReferenceUischema,
  referencesOf,
  referenceTypeOf,
} from '../renderers/ui/document-reference';
import { type DocumentContent, variantOf } from './document-types';
import { controlsOf, keyOfScope } from './variants/variant-bindings';

/**
 * Doc 289 rule 1: the application methods a service version references — the ids stored under every DEFAULT-variant
 * document reference whose type is an application method (every Form of a Funnel included), in reading order and each
 * once. The ONE reader for the precheck, publish, new version, discard and the method read (doc 289 contract 1).
 */
export function applicationMethodIds(content: DocumentContent): string[] {
  const ids = controlsOf(variantOf(content))
    .filter(
      (control) =>
        isDocumentReferenceUischema(control) &&
        referenceTypeOf(control) === 'services.service-application-method',
    )
    .flatMap((control) => {
      const key = keyOfScope(control['scope']);
      return key === undefined ? [] : referencesOf(content.data?.[key]).map((ref) => ref.id);
    });
  return [...new Set(ids)];
}
