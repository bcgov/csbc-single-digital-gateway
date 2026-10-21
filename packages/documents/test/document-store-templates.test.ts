import { describe, expect, it } from 'vitest';
import { createDocumentStore, type StoredDocument } from '../src/studio/document-store';

const doc = (
  id: string,
  kind: StoredDocument['kind'],
  type: StoredDocument['type'],
  label?: string,
): StoredDocument => ({
  id,
  kind,
  type,
  versions: [
    {
      id: `${id}-v1`,
      versionNumber: 1,
      content: {
        schema: { type: 'object', properties: {} },
        variants: {
          default: {
            id: `${id}-root`,
            type: 'Form',
            ...(label !== undefined && { label }),
            elements: [],
          },
        },
      },
    },
    {
      id: `${id}-v2`,
      versionNumber: 2,
      content: {
        schema: { type: 'object', properties: {} },
        variants: {
          default: {
            id: `${id}-root`,
            type: 'Form',
            ...(label !== undefined && { label: `${label} 2` }),
            elements: [],
          },
        },
      },
    },
  ],
});

const seed = [
  doc('t1', 'template', 'services.service-agreement', 'Terms'),
  doc('t2', 'template', 'services.service', 'Service base'),
  doc('t3', 'template', 'services.service-agreement'),
  doc('d1', 'document', 'services.service-agreement', 'Mine'),
];

describe('document store templates (doc 259 data model)', () => {
  it('lists summaries filtered by kind and type, named by the latest version’s root label', async () => {
    const store = createDocumentStore({ seed });
    await expect(
      store.list({ kind: 'template', type: 'services.service-agreement' }),
    ).resolves.toEqual([
      {
        id: 't1',
        kind: 'template',
        type: 'services.service-agreement',
        name: 'Terms 2',
        versionId: 't1-v2',
        versionNumber: 2,
      },
      {
        id: 't3',
        kind: 'template',
        type: 'services.service-agreement',
        name: 'Untitled',
        versionId: 't3-v2',
        versionNumber: 2,
      },
    ]);
    await expect(store.list()).resolves.toHaveLength(4);
  });

  it('create keeps the template ref; load returns it; save never changes it (rules 2-3)', async () => {
    const store = createDocumentStore({ seed });
    const template = { templateId: 't1', templateVersionId: 't1-v1' };
    const content = (await store.load('t1', 't1-v1'))!.content;
    const ref = await store.create({
      kind: 'document',
      type: 'services.service-agreement',
      content,
      template,
    });
    expect((await store.load(ref.documentId))!.template).toEqual(template);
    await store.save(ref, content);
    expect((await store.load(ref.documentId))!.template).toEqual(template);
    expect((await store.load('d1'))!).not.toHaveProperty('template');
  });
});
