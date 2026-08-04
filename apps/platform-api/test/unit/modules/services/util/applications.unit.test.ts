import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  structureFromDefinition,
  formHasStructure,
  resolveApplications,
  insertApplication,
} from '../../../../../src/modules/services/util/applications';
import { documents, documentVersions, documentReferences } from '@repo/database';

const mockQuery = (resolvedValue: any) => {
  const qb = Promise.resolve(resolvedValue);
  return Object.assign(qb, {
    from: vi.fn().mockReturnValue(qb),
    innerJoin: vi.fn().mockReturnValue(qb),
    limit: vi.fn().mockReturnValue(qb),
    where: vi.fn().mockReturnValue(qb),
  });
};

describe('applications utility tests', () => {
  describe('structureFromDefinition', () => {
    it('returns basic-form structure', () => {
      const def = { schema: { type: 'object' }, uischema: { type: 'Vertical' } };
      const res = structureFromDefinition('basic-form', def);
      expect(res).toEqual({ schema: { type: 'object' }, uischema: { type: 'Vertical' } });
    });

    it('returns basic-form default structure if keys are missing', () => {
      const res = structureFromDefinition('basic-form', {});
      expect(res).toEqual({ schema: {}, uischema: {} });
    });

    it('returns multi-stage-form structure', () => {
      const def = { stages: [{ id: 's1' }], edges: [{ id: 'e1' }] };
      const res = structureFromDefinition('multi-stage-form', def);
      expect(res).toEqual({ stages: [{ id: 's1' }], edges: [{ id: 'e1' }] });
    });

    it('returns multi-stage-form default structure if keys are missing', () => {
      const res = structureFromDefinition('multi-stage-form', {});
      expect(res).toEqual({ stages: [], edges: [] });
    });

    it('returns null for other kinds', () => {
      const res = structureFromDefinition('service', {});
      expect(res).toBeNull();
    });
  });

  describe('formHasStructure', () => {
    it('returns false if definition is null or undefined', () => {
      expect(formHasStructure('basic-form', null)).toBe(false);
      expect(formHasStructure('basic-form', undefined)).toBe(false);
    });

    it('validates basic-form structure', () => {
      const hasFields = {
        schema: {
          properties: { name: { type: 'string' } },
        },
      };
      const noFields = {
        schema: {
          properties: {},
        },
      };
      expect(formHasStructure('basic-form', hasFields)).toBe(true);
      expect(formHasStructure('basic-form', noFields)).toBe(false);
      expect(formHasStructure('basic-form', {})).toBe(false);
    });

    it('validates multi-stage-form structure', () => {
      const validMultiStage = {
        stages: [
          {
            pages: [
              {
                schema: { properties: { age: { type: 'number' } } },
              },
            ],
          },
        ],
      };
      const invalidMultiStageNoPages = {
        stages: [{ pages: [] }],
      };
      const invalidMultiStageNoFields = {
        stages: [
          {
            pages: [
              {
                schema: { properties: {} },
              },
            ],
          },
        ],
      };

      expect(formHasStructure('multi-stage-form', validMultiStage)).toBe(true);
      expect(formHasStructure('multi-stage-form', invalidMultiStageNoPages)).toBe(false);
      expect(formHasStructure('multi-stage-form', invalidMultiStageNoFields)).toBe(false);
      expect(formHasStructure('multi-stage-form', { stages: [] })).toBe(false);
      expect(formHasStructure('multi-stage-form', {})).toBe(false);
    });

    it('returns false for other kinds', () => {
      expect(formHasStructure('service', { schema: { properties: { x: 1 } } })).toBe(false);
    });
  });

  describe('resolveApplications', () => {
    let dbMock: any;
    const VALID_UUID_1 = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
    const VALID_UUID_2 = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

    beforeEach(() => {
      dbMock = Object.assign(Promise.resolve([]), {
        select: vi.fn().mockImplementation(() => mockQuery([])),
      });
    });

    it('resolves an existing application successfully', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([
          {
            documentId: 'doc-1',
            kind: 'basic-form',
            workspaceId: 'ws-1',
          },
        ]),
      );

      const input = [
        {
          id: 'app-id',
          label: 'My App',
          position: 1,
          form: { mode: 'existing' as const, versionId: VALID_UUID_1 },
        },
      ];

      const res = await resolveApplications(dbMock, 'service-doc-1', 'ws-1', input);

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        id: 'app-id',
        label: 'My App',
        position: 1,
        mode: 'existing',
        versionId: VALID_UUID_1,
        documentId: 'doc-1',
        kind: 'basic-form',
      });
    });

    it('throws NotFoundException if target version is not found', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      const input = [
        {
          id: 'app-id',
          label: 'My App',
          position: 1,
          form: { mode: 'existing' as const, versionId: VALID_UUID_1 },
        },
      ];

      await expect(resolveApplications(dbMock, 'service-doc-1', 'ws-1', input)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if target is in a different workspace', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([
          {
            documentId: 'doc-1',
            kind: 'basic-form',
            workspaceId: 'ws-different',
          },
        ]),
      );

      const input = [
        {
          id: 'app-id',
          label: 'My App',
          position: 1,
          form: { mode: 'existing' as const, versionId: VALID_UUID_1 },
        },
      ];

      await expect(resolveApplications(dbMock, 'service-doc-1', 'ws-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if the service references itself', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([
          {
            documentId: 'service-doc-1', // same as serviceId
            kind: 'basic-form',
            workspaceId: 'ws-1',
          },
        ]),
      );

      const input = [
        {
          id: 'app-id',
          label: 'My App',
          position: 1,
          form: { mode: 'existing' as const, versionId: VALID_UUID_1 },
        },
      ];

      await expect(resolveApplications(dbMock, 'service-doc-1', 'ws-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if the target document is not a form kind', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([
          {
            documentId: 'doc-1',
            kind: 'service', // not basic-form or multi-stage-form
            workspaceId: 'ws-1',
          },
        ]),
      );

      const input = [
        {
          id: 'app-id',
          label: 'My App',
          position: 1,
          form: { mode: 'existing' as const, versionId: VALID_UUID_1 },
        },
      ];

      await expect(resolveApplications(dbMock, 'service-doc-1', 'ws-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves a new application successfully', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([
          {
            kind: 'multi-stage-form',
            typeVersionId: 'type-version-1',
            definition: { stages: [] },
          },
        ]),
      );

      const input = [
        {
          id: undefined,
          label: 'My App',
          position: 1,
          form: { mode: 'new' as const, typeId: VALID_UUID_2, title: 'Form Title' },
        },
      ];

      const res = await resolveApplications(dbMock, 'service-doc-1', 'ws-1', input);

      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        id: undefined,
        label: 'My App',
        position: 1,
        mode: 'new',
        typeId: VALID_UUID_2,
        typeVersionId: 'type-version-1',
        kind: 'multi-stage-form',
        title: 'Form Title',
        definition: { stages: [] },
        designedDefinition: undefined,
      });
    });

    it('throws UnprocessableEntityException if the type is not found or has no published version', async () => {
      dbMock.select.mockReturnValueOnce(mockQuery([]));

      const input = [
        {
          id: undefined,
          label: 'My App',
          position: 1,
          form: { mode: 'new' as const, typeId: VALID_UUID_2, title: 'Form Title' },
        },
      ];

      await expect(resolveApplications(dbMock, 'service-doc-1', 'ws-1', input)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws BadRequestException if the new form type is not a form kind', async () => {
      dbMock.select.mockReturnValueOnce(
        mockQuery([
          {
            kind: 'service', // not basic-form or multi-stage-form
            typeVersionId: 'type-version-1',
            definition: {},
          },
        ]),
      );

      const input = [
        {
          id: undefined,
          label: 'My App',
          position: 1,
          form: { mode: 'new' as const, typeId: VALID_UUID_2, title: 'Form Title' },
        },
      ];

      await expect(resolveApplications(dbMock, 'service-doc-1', 'ws-1', input)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('insertApplication', () => {
    let txMock: any;
    const owner = {
      ownerVersionId: 'owner-v-1',
      ownerDocumentId: 'owner-doc-1',
      workspaceId: 'ws-1',
    };

    beforeEach(() => {
      txMock = Object.assign(Promise.resolve([]), {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn(),
      });
    });

    it('inserts an existing application relation directly', async () => {
      const app = {
        id: 'app-id',
        label: 'Submit Application',
        position: 0,
        mode: 'existing' as const,
        versionId: 'version-1',
        documentId: 'form-doc-1',
        kind: 'basic-form',
      };

      await insertApplication(txMock, owner, app);

      expect(txMock.insert).toHaveBeenCalledTimes(1);
      expect(txMock.insert).toHaveBeenCalledWith(documentReferences);
    });

    it('creates a new form document and draft version, then inserts its reference', async () => {
      const app = {
        id: undefined,
        label: 'Submit Application',
        position: 0,
        mode: 'new' as const,
        typeId: 'type-1',
        typeVersionId: 'tv-1',
        kind: 'basic-form',
        title: 'New Form Title',
        definition: {},
        designedDefinition: undefined,
      };

      txMock.returning
        .mockResolvedValueOnce([{ id: 'new-form-doc-1' }]) // doc insert
        .mockResolvedValueOnce([{ id: 'new-form-version-1' }]); // version insert

      await insertApplication(txMock, owner, app);

      expect(txMock.insert).toHaveBeenNthCalledWith(1, documents);
      expect(txMock.insert).toHaveBeenNthCalledWith(2, documentVersions);
      expect(txMock.insert).toHaveBeenNthCalledWith(3, documentReferences);
    });

    it('throws Error if form document insert returned no row', async () => {
      const app = {
        id: undefined,
        label: 'Submit Application',
        position: 0,
        mode: 'new' as const,
        typeId: 'type-1',
        typeVersionId: 'tv-1',
        kind: 'basic-form',
        title: 'New Form Title',
        definition: {},
        designedDefinition: undefined,
      };

      txMock.returning.mockResolvedValueOnce([]); // empty doc insert

      await expect(insertApplication(txMock, owner, app)).rejects.toThrow(
        new Error('form document insert returned no row'),
      );
    });

    it('throws Error if form version insert returned no row', async () => {
      const app = {
        id: undefined,
        label: 'Submit Application',
        position: 0,
        mode: 'new' as const,
        typeId: 'type-1',
        typeVersionId: 'tv-1',
        kind: 'basic-form',
        title: 'New Form Title',
        definition: {},
        designedDefinition: undefined,
      };

      txMock.returning.mockResolvedValueOnce([{ id: 'new-form-doc-1' }]).mockResolvedValueOnce([]); // empty version insert

      await expect(insertApplication(txMock, owner, app)).rejects.toThrow(
        new Error('form version insert returned no row'),
      );
    });
  });
});
