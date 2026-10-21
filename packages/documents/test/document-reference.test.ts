import { describe, expect, it } from 'vitest';
import {
  appendReferences,
  isDocumentReferenceControl,
  referencesOf,
  referenceItemsSchema,
  referenceTypeOf,
  REFERENCE_POLICY,
  removeReference,
  toReference,
} from '../src/renderers/ui/document-reference';

const control = (options: Record<string, unknown>) => ({
  type: 'Control',
  scope: '#/properties/refs',
  options,
});
const arraySchema = { type: 'array', items: referenceItemsSchema() };

describe('document reference model', () => {
  describe('referenceTypeOf', () => {
    it('returns the documentType when it is one of DOCUMENT_TYPES', () => {
      expect(referenceTypeOf(control({ documentType: 'services.service' }))).toBe(
        'services.service',
      );
      expect(referenceTypeOf(control({ documentType: 'services.service-agreement' }))).toBe(
        'services.service-agreement',
      );
      expect(
        referenceTypeOf(control({ documentType: 'services.service-application-method' })),
      ).toBe('services.service-application-method');
    });

    it('returns undefined for an absent, non-string or unknown documentType', () => {
      expect(referenceTypeOf(control({}))).toBeUndefined();
      expect(referenceTypeOf(control({ documentType: 3 }))).toBeUndefined();
      expect(referenceTypeOf(control({ documentType: 'services.other' }))).toBeUndefined();
      expect(referenceTypeOf({ type: 'Control' })).toBeUndefined();
    });
  });

  describe('REFERENCE_POLICY', () => {
    it('is frozen and allows pick only for services.service', () => {
      expect(Object.isFrozen(REFERENCE_POLICY)).toBe(true);
      expect(Object.isFrozen(REFERENCE_POLICY['services.service'])).toBe(true);
      expect(REFERENCE_POLICY['services.service']).toEqual({
        pick: true,
        create: false,
        deleteOnRemove: false,
      });
    });

    it('allows create only and deleteOnRemove for services.service-application-method', () => {
      expect(REFERENCE_POLICY['services.service-application-method']).toEqual({
        pick: false,
        create: true,
        deleteOnRemove: true,
      });
    });

    it('allows pick and create for services.service-agreement', () => {
      expect(REFERENCE_POLICY['services.service-agreement']).toEqual({
        pick: true,
        create: true,
        deleteOnRemove: false,
      });
    });
  });

  describe('toReference', () => {
    it('keeps id, a non-empty title and workspaceId and drops status and workspaceName', () => {
      const reference = toReference({
        id: 'd1',
        title: 'Parking',
        description: 'Permits',
        workspaceId: 'w1',
        workspaceName: 'City',
        status: 'published',
      });
      expect(reference).toEqual({
        id: 'd1',
        title: 'Parking',
        description: 'Permits',
        workspaceId: 'w1',
      });
      expect(reference).not.toHaveProperty('status');
      expect(reference).not.toHaveProperty('workspaceName');
    });

    it('truncates a description longer than 200 characters to 200 including the ellipsis', () => {
      const reference = toReference({ id: 'd1', description: 'x'.repeat(250) });
      expect(reference.description).toHaveLength(200);
      expect(reference.description?.endsWith('…')).toBe(true);
      expect(toReference({ id: 'd1', description: 'y'.repeat(200) }).description).toBe(
        'y'.repeat(200),
      );
    });

    it('omits description and workspaceId keys when null or empty (never undefined values)', () => {
      const reference = toReference({ id: 'd1', title: ' ', description: null, workspaceId: null });
      expect(Object.keys(reference)).toEqual(['id']);
      expect(toReference({ id: 'd2', description: '' })).not.toHaveProperty('description');
    });
  });

  describe('referencesOf', () => {
    it('skips entries without a string id and non-array data', () => {
      expect(referencesOf(undefined)).toEqual([]);
      expect(referencesOf({ id: 'x' })).toEqual([]);
      expect(
        referencesOf([{ id: 'a', title: 'A' }, { title: 'no id' }, { id: 4 }, null, 'b']),
      ).toEqual([{ id: 'a', title: 'A' }]);
    });
  });

  describe('appendReferences', () => {
    it('appends in order and ignores ids already present', () => {
      expect(
        appendReferences([{ id: 'a' }], [{ id: 'b' }, { id: 'a', title: 'dup' }, { id: 'b' }]),
      ).toEqual([{ id: 'a' }, { id: 'b' }]);
      expect(appendReferences([], [])).toBeUndefined();
    });
  });

  describe('removeReference', () => {
    it('returns undefined, never [], when the last reference is removed', () => {
      expect(removeReference([{ id: 'a' }], 'a')).toBeUndefined();
      expect(removeReference([{ id: 'a' }, { id: 'b' }], 'a')).toEqual([{ id: 'b' }]);
    });
  });

  describe('isDocumentReferenceControl', () => {
    it('matches an object array with component document-reference and nothing else', () => {
      expect(
        isDocumentReferenceControl(control({ component: 'document-reference' }), arraySchema),
      ).toBe(true);
      expect(isDocumentReferenceControl(control({ component: 'record' }), arraySchema)).toBe(false);
      expect(
        isDocumentReferenceControl(control({ component: 'document-reference' }), {
          type: 'array',
          items: { type: 'string' },
        }),
      ).toBe(false);
      expect(
        isDocumentReferenceControl(
          { type: 'Label', options: { component: 'document-reference' } },
          arraySchema,
        ),
      ).toBe(false);
    });
  });
});
