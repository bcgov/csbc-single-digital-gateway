import { describe, expect, it } from 'vitest';
import { applicationMethodIds, type DocumentContent, documentLinks } from '../src/content';

const ref = (key: string, documentType: string) => ({
  type: 'Control',
  scope: `#/properties/${key}`,
  options: { component: 'document-reference', documentType },
});
const METHOD = 'services.service-application-method';

function content(
  root: Record<string, unknown>,
  data?: Record<string, unknown>,
  other?: Record<string, unknown>,
): DocumentContent {
  return {
    schema: { type: 'object', properties: {} },
    variants: { default: root, ...(other !== undefined && { Staff: other }) },
    ...(data !== undefined && { data }),
  };
}

// Doc 289 rule 1: the application methods a service version references.
describe('applicationMethodIds (doc 289 rule 1)', () => {
  describe('reads', () => {
    it('returns the ids of default-variant application-method references, in order and each once', () => {
      const c = content(
        { type: 'Form', elements: [ref('a', METHOD), ref('b', METHOD)] },
        { a: [{ id: 'm2' }, { id: 'm1' }], b: [{ id: 'm1' }, { id: 'm3', title: 'Mail' }] },
      );
      expect(applicationMethodIds(c)).toEqual(['m2', 'm1', 'm3']);
    });

    it('reads references inside every Form of a Funnel', () => {
      const c = content(
        {
          type: 'Funnel',
          elements: [
            { type: 'Form', elements: [ref('a', METHOD)] },
            { type: 'Form', elements: [{ type: 'VerticalLayout', elements: [ref('b', METHOD)] }] },
          ],
        },
        { a: [{ id: 'm1' }], b: [{ id: 'm2' }] },
      );
      expect(applicationMethodIds(c)).toEqual(['m1', 'm2']);
    });

    it('ignores references of other document types and non-reference controls', () => {
      const c = content(
        {
          type: 'Form',
          elements: [
            ref('svc', 'services.service'),
            ref('agr', 'services.service-agreement'),
            { type: 'Control', scope: '#/properties/plain' },
            {
              type: 'Control',
              scope: '#/properties/untyped',
              options: { component: 'document-reference' },
            },
          ],
        },
        { svc: [{ id: 's1' }], agr: [{ id: 'a1' }], plain: [{ id: 'x' }], untyped: [{ id: 'y' }] },
      );
      expect(applicationMethodIds(c)).toEqual([]);
    });

    it('ignores Controls only in non-default variants', () => {
      const c = content(
        { type: 'Form', elements: [] },
        { a: [{ id: 'm1' }] },
        { type: 'Form', elements: [ref('a', METHOD)] },
      );
      expect(applicationMethodIds(c)).toEqual([]);
    });

    it('skips rows without a string id and returns [] without data', () => {
      const root = { type: 'Form', elements: [ref('a', METHOD)] };
      expect(
        applicationMethodIds(content(root, { a: [{ title: 'x' }, { id: 7 }, 'm', { id: 'ok' }] })),
      ).toEqual(['ok']);
      expect(applicationMethodIds(content(root))).toEqual([]);
      expect(applicationMethodIds(content(root, { a: 'not an array' }))).toEqual([]);
    });
  });
});

// Doc 290.
describe('documentLinks (doc 290 rule 1)', () => {
  describe('reads', () => {
    it('returns every default-variant reference with its field key and type, each (field, id) once', () => {
      const c = content(
        {
          type: 'Form',
          elements: [
            ref('svc', 'services.service'),
            ref('m', METHOD),
            ref('agr', 'services.service-agreement'),
          ],
        },
        {
          svc: [{ id: 's1' }, { id: 's1' }],
          m: [{ id: 'm1' }],
          agr: [{ id: 'a1' }, { id: 'm1' }],
        },
      );
      expect(documentLinks(c)).toEqual([
        { fieldKey: 'svc', targetType: 'services.service', targetId: 's1' },
        { fieldKey: 'm', targetType: METHOD, targetId: 'm1' },
        { fieldKey: 'agr', targetType: 'services.service-agreement', targetId: 'a1' },
        // The same id in ANOTHER field is another link.
        { fieldKey: 'agr', targetType: 'services.service-agreement', targetId: 'm1' },
      ]);
    });

    it('ignores references without a known documentType and non-default variants', () => {
      const c = content(
        {
          type: 'Form',
          elements: [
            ref('bad', 'services.nope'),
            {
              type: 'Control',
              scope: '#/properties/untyped',
              options: { component: 'document-reference' },
            },
          ],
        },
        { bad: [{ id: 'x' }], untyped: [{ id: 'y' }], other: [{ id: 'z' }] },
        { type: 'Form', elements: [ref('other', 'services.service')] },
      );
      expect(documentLinks(c)).toEqual([]);
    });

    it('keeps applicationMethodIds as the application-method ids of documentLinks', () => {
      const c = content(
        {
          type: 'Form',
          elements: [ref('a', METHOD), ref('svc', 'services.service'), ref('b', METHOD)],
        },
        { a: [{ id: 'm1' }], svc: [{ id: 's1' }], b: [{ id: 'm1' }, { id: 'm2' }] },
      );
      expect(applicationMethodIds(c)).toEqual(
        documentLinks(c)
          .filter((link) => link.targetType === METHOD)
          .map((link) => link.targetId)
          .filter((id, i, all) => all.indexOf(id) === i),
      );
      expect(applicationMethodIds(c)).toEqual(['m1', 'm2']);
    });
  });
});
