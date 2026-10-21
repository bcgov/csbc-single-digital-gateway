import { DOCUMENT_TYPES, type DocumentType } from '../../studio/document-types';
import { isObjectArray } from './object-array';

/**
 * A document reference (doc 287): an object-array Control with `options.component: 'document-reference'` whose
 * answers point at other, independent documents. The ONE reader of its options and stored rows — the renderers, the
 * read-back and the inspector all go through here.
 */

export const DOCUMENT_REFERENCE_COMPONENT = 'document-reference';

/** The most of a referenced document's description a parent keeps (rule 4), the ellipsis included. */
export const REFERENCE_DESCRIPTION_MAX = 200;

/** One stored reference (data model): enough to point at the document and draw its card. */
export interface DocumentReference {
  id: string;
  title?: string;
  description?: string;
  workspaceId?: string;
}

/** A document the host offers to reference, or has just created (rules 7-8). */
export interface ReferenceCandidate {
  id: string;
  title?: string | null;
  description?: string | null;
  workspaceId?: string | null;
  workspaceName?: string | null;
  status?: string;
}

export interface ReferencePolicy {
  /** "Add existing" — pick documents the host lists. */
  readonly pick: boolean;
  /** "Create new" — create a document of the type from one of its templates. */
  readonly create: boolean;
  /** Removing a reference also deletes the document it points at (user decision 2026-10-08). */
  readonly deleteOnRemove: boolean;
}

/** What each document type lets the control do (rule 3). */
export const REFERENCE_POLICY: Readonly<Record<DocumentType, ReferencePolicy>> = Object.freeze({
  'services.service': Object.freeze({ pick: true, create: false, deleteOnRemove: false }),
  'services.service-application-method': Object.freeze({
    pick: false,
    create: true,
    deleteOnRemove: true,
  }),
  'services.service-agreement': Object.freeze({ pick: true, create: true, deleteOnRemove: false }),
});

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function optionsOf(uischema: unknown): Record<string, unknown> | undefined {
  return recordOf(recordOf(uischema)?.['options']);
}

/** Whether `uischema` asks for the document reference presentation (rule 1, the uischema half). */
export function isDocumentReferenceUischema(uischema: unknown): boolean {
  return optionsOf(uischema)?.['component'] === DOCUMENT_REFERENCE_COMPONENT;
}

/** Rule 1: an object array presented as a document reference. */
export function isDocumentReferenceControl(uischema: unknown, schema: unknown): boolean {
  return (
    recordOf(uischema)?.['type'] === 'Control' &&
    isDocumentReferenceUischema(uischema) &&
    isObjectArray(schema)
  );
}

/** Rule 2: the referenced document type, or `undefined` for an absent or unknown one. */
export function referenceTypeOf(uischema: unknown): DocumentType | undefined {
  const value = optionsOf(uischema)?.['documentType'];
  return (DOCUMENT_TYPES as readonly unknown[]).includes(value)
    ? (value as DocumentType)
    : undefined;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/** `text` cut to `max` characters, the ellipsis included. */
export function truncate(text: string, max: number = REFERENCE_DESCRIPTION_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Rule 4: the stored snapshot of a candidate — never its status or workspace name; absent keys, never `undefined`. */
export function toReference(candidate: ReferenceCandidate): DocumentReference {
  const title = nonEmpty(candidate.title);
  const description = nonEmpty(candidate.description);
  const workspaceId = nonEmpty(candidate.workspaceId);
  return {
    id: candidate.id,
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description: truncate(description) }),
    ...(workspaceId !== undefined && { workspaceId }),
  };
}

/** Rule 5: the stored references, skipping anything without a string id. */
export function referencesOf(data: unknown): DocumentReference[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry): DocumentReference[] => {
    const row = recordOf(entry);
    const id = nonEmpty(row?.['id']);
    if (row === undefined || id === undefined) return [];
    return [toReference({ ...row, id } as ReferenceCandidate)];
  });
}

/** Rule 5: `references` followed by those `added` not already present — `undefined` when the result is empty. */
export function appendReferences(
  references: readonly DocumentReference[],
  added: readonly DocumentReference[],
): DocumentReference[] | undefined {
  const ids = new Set(references.map((reference) => reference.id));
  const next = [...references];
  for (const reference of added) {
    if (ids.has(reference.id)) continue;
    ids.add(reference.id);
    next.push(reference);
  }
  return next.length === 0 ? undefined : next;
}

/** Rule 5: `references` without `id` — `undefined`, never `[]`, when none remain. */
export function removeReference(
  references: readonly DocumentReference[],
  id: string,
): DocumentReference[] | undefined {
  const next = references.filter((reference) => reference.id !== id);
  return next.length === 0 ? undefined : next;
}

/** The fixed item schema a document reference property holds (data model). */
export function referenceItemsSchema(): Record<string, unknown> {
  return {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string' },
      description: { type: 'string', maxLength: REFERENCE_DESCRIPTION_MAX },
      workspaceId: { type: 'string' },
    },
  };
}
