import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { DocumentType } from '../../studio/document-types';
import type { DocumentReference, ReferenceCandidate } from './document-reference';

// The port a host hands the document reference control (doc 287). The control is dispatched INSIDE `<JsonForms>`, so
// it cannot take props: the host's document listing and creation reach it here, as the runner's handlers do
// (`renderers/default/funnel/runner-port.ts`). The package never fetches. No provider = no host: stored references
// are listed and the actions are disabled (rule 10).

/** A published template of the referenced type, offered by the create dialog (rule 8). */
export interface ReferenceTemplate {
  id: string;
  title: string;
}

export interface DocumentReferenceSource {
  /** Documents of `type` that may be referenced, matching `q` (rule 7). */
  candidates(type: DocumentType, query: { q: string }): Promise<ReferenceCandidate[]>;
  /** The published templates of `type` (rule 8). */
  templates(type: DocumentType): Promise<ReferenceTemplate[]>;
  /** Create a document of `type` from `templateId`, returning it as a candidate (rule 8). */
  create(
    type: DocumentType,
    input: { title: string; templateId: string },
  ): Promise<ReferenceCandidate>;
  /** Delete the referenced document — called only when the type's policy says `deleteOnRemove` (rule 9). */
  remove(type: DocumentType, id: string): Promise<void>;
  /** Where a reference's card links to, or `undefined` for no link (rule 18). */
  href?(type: DocumentType, reference: DocumentReference): string | undefined;
}

const DocumentReferenceContext = createContext<DocumentReferenceSource | null>(null);

export const DocumentReferenceProvider = DocumentReferenceContext.Provider;

/** The host's reference source, or `null` when nothing provides one. */
export function useReferenceSource(): DocumentReferenceSource | null {
  return useContext(DocumentReferenceContext);
}

/** `children` under `source` when one is given; otherwise left to whatever provider is already around them. */
export function withReferences(
  source: DocumentReferenceSource | undefined,
  children: ReactNode,
): ReactNode {
  return source === undefined
    ? children
    : createElement(DocumentReferenceProvider, { value: source }, children);
}
