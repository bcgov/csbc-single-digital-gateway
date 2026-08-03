import { describe, expect, it } from 'vitest';
import {
  applicationFormRefSchema,
  applicationInputSchema,
  createServiceSchema,
  updateVersionDataSchema,
  toServiceDto,
  toServiceVersionDto,
  listServicesQuerySchema,
} from '../../../../../src/modules/services/dtos/service.dtos';
import type { Document, DocumentVersion } from '@repo/database';

const VALID_UUID_1 = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
const VALID_UUID_2 = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const VALID_UUID_3 = '11111111-1111-4111-8111-111111111111';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('service DTO schemas', () => {
  describe('applicationFormRefSchema', () => {
    it('validates mode existing with a valid uuid versionId', () => {
      const payload = {
        mode: 'existing',
        versionId: VALID_UUID_1,
      };
      const result = applicationFormRefSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates mode new with valid uuid typeId and non-empty title', () => {
      const payload = {
        mode: 'new',
        typeId: VALID_UUID_2,
        title: 'New Application Form',
        definition: { schema: {}, uischema: {} },
      };
      const result = applicationFormRefSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid inputs', () => {
      expect(
        applicationFormRefSchema.safeParse({ mode: 'existing', versionId: 'invalid' }).success,
      ).toBe(false);
      expect(
        applicationFormRefSchema.safeParse({ mode: 'new', typeId: 'invalid', title: '' }).success,
      ).toBe(false);
    });
  });

  describe('applicationInputSchema', () => {
    it('validates a correct application input', () => {
      const payload = {
        id: VALID_UUID_1,
        label: 'Apply Now',
        position: 1,
        form: {
          mode: 'existing',
          versionId: VALID_UUID_2,
        },
      };
      const result = applicationInputSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('createServiceSchema', () => {
    it('validates a valid createService payload', () => {
      const payload = {
        workspaceId: VALID_UUID_1,
        title: 'Service Title',
        data: { key: 'value' },
        applications: [
          {
            label: 'Submit',
            position: 0,
            form: {
              mode: 'new',
              typeId: VALID_UUID_2,
              title: 'Sub Form',
            },
          },
        ],
      };
      const result = createServiceSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
    it('createServiceSchema requires a uuid workspaceId and a non-empty title', () => {
      expect(
        createServiceSchema.safeParse({ workspaceId: VALID_UUID_3, title: 'Permit' }).success,
      ).toBe(true);
      expect(createServiceSchema.safeParse({ title: 'Permit' }).success).toBe(false);
      expect(
        createServiceSchema.safeParse({ workspaceId: 'not-a-uuid', title: 'Permit' }).success,
      ).toBe(false);
      expect(createServiceSchema.safeParse({ workspaceId: VALID_UUID_3, title: '' }).success).toBe(
        false,
      );
    });

    it('listServicesQuerySchema requires a uuid workspaceId', () => {
      expect(listServicesQuerySchema.safeParse({ workspaceId: VALID_UUID_3 }).success).toBe(true);
      expect(listServicesQuerySchema.safeParse({}).success).toBe(false);
    });

    it('updateVersionDataSchema requires a data object; applications are optional', () => {
      expect(updateVersionDataSchema.safeParse({ data: { title: 'x' } }).success).toBe(true);
      expect(updateVersionDataSchema.safeParse({ data: 'nope' }).success).toBe(false);
      expect(updateVersionDataSchema.safeParse({}).success).toBe(false);
    });

    it('createServiceSchema accepts applications (existing + new form) and defaults them empty', () => {
      const parsed = createServiceSchema.safeParse({ workspaceId: VALID_UUID_3, title: 'Permit' });
      expect(parsed.success && parsed.data.applications).toEqual([]);
      expect(
        createServiceSchema.safeParse({
          workspaceId: VALID_UUID_3,
          title: 'Permit',
          data: { description: 'd' },
          applications: [
            { label: 'Apply', form: { mode: 'existing', versionId: VALID_UUID_3 } },
            { label: 'New', form: { mode: 'new', typeId: VALID_UUID_3, title: 'A form' } },
          ],
        }).success,
      ).toBe(true);
      // A new-form application without a title is rejected by the discriminated union.
      expect(
        createServiceSchema.safeParse({
          workspaceId: VALID_UUID_3,
          title: 'Permit',
          applications: [{ label: 'X', form: { mode: 'new', typeId: VALID_UUID_3 } }],
        }).success,
      ).toBe(false);
    });
  });

  describe('updateVersionDataSchema', () => {
    it('validates a valid updateVersion payload', () => {
      const payload = {
        data: { someData: 123 },
        title: 'New Title',
      };
      const result = updateVersionDataSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('toServiceDto', () => {
    it('maps Document row to ServiceResponse DTO', () => {
      const mockRow = {
        id: 'service-1',
        workspaceId: 'ws-1',
        title: 'My Service',
        description: 'Service description',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        updatedAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      const result = toServiceDto(mockRow as unknown as Document);

      expect(result).toEqual({
        id: 'service-1',
        workspaceId: 'ws-1',
        title: 'My Service',
        description: 'Service description',
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      });
    });

    it('throws Error if workspaceId is null', () => {
      const mockRow = {
        id: 'service-1',
        workspaceId: null,
        title: 'My Service',
        description: 'Service description',
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
      };

      expect(() => toServiceDto(mockRow as unknown as Document)).toThrow(
        'service document has no workspace',
      );
    });
  });

  describe('toServiceVersionDto', () => {
    it('maps DocumentVersion row to ServiceVersionResponse DTO', () => {
      const mockRow = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'published',
        data: { key: 'value' },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        publishedAt: new Date('2026-07-12T01:00:00.000Z'),
        archivedAt: null,
      };

      const result = toServiceVersionDto(mockRow as unknown as DocumentVersion);

      expect(result).toEqual({
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'published',
        data: { key: 'value' },
        createdAt: '2026-07-12T00:00:00.000Z',
        publishedAt: '2026-07-12T01:00:00.000Z',
        archivedAt: null,
      });
    });

    it('maps null publishedAt and defined archivedAt correctly', () => {
      const mockRow = {
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'archived',
        data: { key: 'value' },
        createdAt: new Date('2026-07-12T00:00:00.000Z'),
        publishedAt: null,
        archivedAt: new Date('2026-07-12T02:00:00.000Z'),
      };

      const result = toServiceVersionDto(mockRow as unknown as DocumentVersion);

      expect(result).toEqual({
        id: 'version-1',
        documentId: 'service-1',
        version: 1,
        status: 'archived',
        data: { key: 'value' },
        createdAt: '2026-07-12T00:00:00.000Z',
        publishedAt: null,
        archivedAt: '2026-07-12T02:00:00.000Z',
      });
    });
  });

  describe('service DTO schemas', () => {
    it('createServiceSchema requires a uuid workspaceId and a non-empty title', () => {
      expect(createServiceSchema.safeParse({ workspaceId: UUID, title: 'Permit' }).success).toBe(
        true,
      );
      expect(createServiceSchema.safeParse({ title: 'Permit' }).success).toBe(false);
      expect(
        createServiceSchema.safeParse({ workspaceId: 'not-a-uuid', title: 'Permit' }).success,
      ).toBe(false);
      expect(createServiceSchema.safeParse({ workspaceId: UUID, title: '' }).success).toBe(false);
    });

    it('listServicesQuerySchema requires a uuid workspaceId', () => {
      expect(listServicesQuerySchema.safeParse({ workspaceId: UUID }).success).toBe(true);
      expect(listServicesQuerySchema.safeParse({}).success).toBe(false);
    });

    it('updateVersionDataSchema requires a data object; applications are optional', () => {
      expect(updateVersionDataSchema.safeParse({ data: { title: 'x' } }).success).toBe(true);
      expect(updateVersionDataSchema.safeParse({ data: 'nope' }).success).toBe(false);
      expect(updateVersionDataSchema.safeParse({}).success).toBe(false);
    });

    it('updateVersionDataSchema accepts an optional applicationOrder of uuids (feature 132)', () => {
      expect(
        updateVersionDataSchema.safeParse({ data: {}, applicationOrder: [UUID, UUID] }).success,
      ).toBe(true);
      // Empty order is valid (a service can have its methods cleared to none).
      expect(updateVersionDataSchema.safeParse({ data: {}, applicationOrder: [] }).success).toBe(
        true,
      );
      // Non-uuid ids are rejected.
      expect(
        updateVersionDataSchema.safeParse({ data: {}, applicationOrder: ['nope'] }).success,
      ).toBe(false);
    });

    it('createServiceSchema accepts applications (existing + new form) and defaults them empty', () => {
      const parsed = createServiceSchema.safeParse({ workspaceId: UUID, title: 'Permit' });
      expect(parsed.success && parsed.data.applications).toEqual([]);
      expect(
        createServiceSchema.safeParse({
          workspaceId: UUID,
          title: 'Permit',
          data: { description: 'd' },
          applications: [
            { label: 'Apply', form: { mode: 'existing', versionId: UUID } },
            { label: 'New', form: { mode: 'new', typeId: UUID, title: 'A form' } },
          ],
        }).success,
      ).toBe(true);
      // A new-form application without a title is rejected by the discriminated union.
      expect(
        createServiceSchema.safeParse({
          workspaceId: UUID,
          title: 'Permit',
          applications: [{ label: 'X', form: { mode: 'new', typeId: UUID } }],
        }).success,
      ).toBe(false);
    });
  });
});
