import { describe, expect, it } from 'vitest';
import { createDocumentStore, STUB_DOCUMENTS } from '../src/studio';

const content = (label: string) => ({
  schema: { type: 'object', properties: {} },
  variants: { default: { type: 'Form', label, elements: [] } },
});

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

describe('createDocumentStore', () => {
  it('loads the latest version when no version is named', async () => {
    const store = createDocumentStore({ seed: STUB_DOCUMENTS });

    const loaded = await store.load('stub-service');

    expect(loaded).toMatchObject({
      documentId: 'stub-service',
      versionId: 'stub-service-v2',
      versionNumber: 2,
      kind: 'document',
      type: 'services.service',
    });
  });

  it('loads the named version', async () => {
    const store = createDocumentStore({ seed: STUB_DOCUMENTS });

    const loaded = await store.load('stub-service', 'stub-service-v1');

    expect(loaded?.versionNumber).toBe(1);
    expect(loaded?.content.variants.default['label']).toBe('Fishing licence (v1)');
  });

  it('returns null for an unknown document or a version of another document', async () => {
    const store = createDocumentStore({ seed: STUB_DOCUMENTS });

    expect(await store.load('nope')).toBeNull();
    expect(await store.load('stub-service', 'stub-agreement-template-v1')).toBeNull();
  });

  it('creates a document whose first version holds the content, and saves over that version', async () => {
    const store = createDocumentStore();

    const ref = await store.create({
      kind: 'template',
      type: 'services.service-agreement',
      content: content('Draft'),
    });
    await store.save(ref, content('Final'));

    expect(await store.load(ref.documentId)).toMatchObject({
      ...ref,
      kind: 'template',
      versionNumber: 1,
      content: content('Final'),
    });
  });

  it('rejects a save to a version it does not hold', async () => {
    const store = createDocumentStore();

    await expect(store.save({ documentId: 'x', versionId: 'y' }, content('A'))).rejects.toThrow(
      'No version y of document x',
    );
  });

  it('persists to storage, and a new store over the same storage ignores the seed', async () => {
    const storage = new MemoryStorage();
    const ref = await createDocumentStore({ storage, seed: STUB_DOCUMENTS }).create({
      kind: 'document',
      type: 'services.service',
      content: content('Saved in the browser'),
    });

    const reopened = createDocumentStore({ storage, seed: [] });

    expect((await reopened.load(ref.documentId))?.content).toEqual(content('Saved in the browser'));
    expect(await reopened.load('stub-service')).not.toBeNull();
  });

  it('adds seed documents missing from storage, but never replaces a stored one with the same id', async () => {
    const storage = new MemoryStorage();
    const first = createDocumentStore({ storage, seed: STUB_DOCUMENTS.slice(0, 1) });
    const loaded = await first.load('stub-service');
    await first.save(loaded!, content('Edited in the browser'));

    const reopened = createDocumentStore({ storage, seed: STUB_DOCUMENTS });

    expect((await reopened.load('stub-service'))?.content).toEqual(
      content('Edited in the browser'),
    );
    expect(await reopened.load('stub-application')).not.toBeNull();
  });

  it('never lets a caller mutate stored content through a loaded copy', async () => {
    const store = createDocumentStore({ seed: STUB_DOCUMENTS });

    const first = await store.load('stub-service');
    first!.content.variants.default['label'] = 'mutated';

    expect((await store.load('stub-service'))?.content.variants.default['label']).toBe(
      'Fishing licence (v2)',
    );
  });
});
