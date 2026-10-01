import type { DocumentContent, DocumentKind, DocumentType } from './document-types';

/**
 * Where the studio loads and saves documents. SPIKE: nothing talks to the API yet — the default store
 * keeps documents in the browser (`localStorage`), so a document can be created and saved before the
 * server manages it. An API-backed store implements the same interface later.
 */
export interface DocumentStore {
  /** The document with one version: `versionId`'s, else the latest. `null` when either is unknown. */
  load(documentId: string, versionId?: string): Promise<LoadedDocument | null>;
  /** Creates a document with a first version holding `content`. */
  create(input: {
    kind: DocumentKind;
    type: DocumentType;
    content: DocumentContent;
  }): Promise<DocumentRef>;
  /** Replaces a version's content. */
  save(ref: DocumentRef, content: DocumentContent): Promise<void>;
}

export interface DocumentRef {
  documentId: string;
  versionId: string;
}

export interface LoadedDocument extends DocumentRef {
  kind: DocumentKind;
  type: DocumentType;
  versionNumber: number;
  content: DocumentContent;
}

export interface StoredVersion {
  id: string;
  versionNumber: number;
  content: DocumentContent;
}

export interface StoredDocument {
  id: string;
  kind: DocumentKind;
  type: DocumentType;
  versions: StoredVersion[];
}

export interface DocumentStoreOptions {
  /** Where documents persist; `null` keeps them in memory only. */
  storage?: Storage | null;
  /** Documents to start with; each is added unless the storage already holds one with its id. */
  seed?: StoredDocument[];
  key?: string;
}

/** Versioned: bump it when `DocumentContent` changes shape, so stale browser data is ignored, not misread. */
const DEFAULT_KEY = 'repo-documents:stub-store:v2';

export function createDocumentStore({
  storage = null,
  seed = [],
  key = DEFAULT_KEY,
}: DocumentStoreOptions = {}): DocumentStore {
  // Seed documents missing from storage (by id) are added, so a browser holding saved documents still gets new stubs.
  const stored = readStorage(storage, key) ?? [];
  const missing = seed.filter((doc) => !stored.some((kept) => kept.id === doc.id));
  const documents = new Map<string, StoredDocument>(
    [...stored, ...missing].map((doc) => [doc.id, structuredClone(doc)]),
  );
  const persist = () => writeStorage(storage, key, [...documents.values()]);

  return {
    load(documentId, versionId) {
      const doc = documents.get(documentId);
      const version = doc === undefined ? undefined : pickVersion(doc, versionId);
      if (doc === undefined || version === undefined) return Promise.resolve(null);
      return Promise.resolve({
        documentId: doc.id,
        versionId: version.id,
        kind: doc.kind,
        type: doc.type,
        versionNumber: version.versionNumber,
        content: structuredClone(version.content),
      });
    },
    create({ kind, type, content }) {
      const ref = { documentId: crypto.randomUUID(), versionId: crypto.randomUUID() };
      documents.set(ref.documentId, {
        id: ref.documentId,
        kind,
        type,
        versions: [{ id: ref.versionId, versionNumber: 1, content: structuredClone(content) }],
      });
      persist();
      return Promise.resolve(ref);
    },
    save({ documentId, versionId }, content) {
      const version = documents.get(documentId)?.versions.find((v) => v.id === versionId);
      if (version === undefined) {
        return Promise.reject(new Error(`No version ${versionId} of document ${documentId}`));
      }
      version.content = structuredClone(content);
      persist();
      return Promise.resolve();
    },
  };
}

function pickVersion(
  doc: StoredDocument,
  versionId: string | undefined,
): StoredVersion | undefined {
  if (versionId !== undefined) return doc.versions.find((v) => v.id === versionId);
  return doc.versions.reduce<StoredVersion | undefined>(
    (latest, v) => (latest === undefined || v.versionNumber > latest.versionNumber ? v : latest),
    undefined,
  );
}

function readStorage(storage: Storage | null, key: string): StoredDocument[] | null {
  if (storage === null) return null;
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as StoredDocument[]);
  } catch (error) {
    console.error(
      `[documents] could not read the stub store "${key}"; starting from the seed`,
      error,
    );
    return null;
  }
}

function writeStorage(storage: Storage | null, key: string, documents: StoredDocument[]): void {
  if (storage === null) return;
  try {
    storage.setItem(key, JSON.stringify(documents));
  } catch (error) {
    console.error(`[documents] could not persist the stub store "${key}"`, error);
    throw error;
  }
}
