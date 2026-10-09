import { describe, expect, it } from 'vitest';
import {
  createServiceAgreementSchema,
  updateServiceAgreementSchema,
  listServiceAgreementsSchema,
  serviceAgreementSchema,
  serviceAgreementVersionSchema,
  serviceAgreementWithVersionSchema,
  agreementDefinitionSchema,
  associatedServiceSchema,
  serviceAgreementDetailSchema,
  serviceAgreementSummarySchema,
} from '../../../../../src/modules/service-agreements/dtos/service-agreement.dtos';

const VALID_UUID = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';

describe('service-agreement DTO schemas', () => {
  describe('createServiceAgreementSchema', () => {
    it('Should accept correct payloads with optional workspaceId', () => {
      const payload = {
        workspaceId: VALID_UUID,
        data: { schema: { type: 'object' } },
      };
      const parsed = createServiceAgreementSchema.parse(payload);
      expect(parsed).toEqual(payload);

      const parsedNoWorkspace = createServiceAgreementSchema.parse({
        data: { schema: {} },
      });
      expect(parsedNoWorkspace).toEqual({ data: { schema: {} } });
    });

    it('Should reject invalid workspaceId UUID format', () => {
      const payload = {
        workspaceId: 'invalid-uuid',
        data: {},
      };
      expect(createServiceAgreementSchema.safeParse(payload).success).toBe(false);
    });

    it('Should reject when data record is missing', () => {
      expect(createServiceAgreementSchema.safeParse({ workspaceId: VALID_UUID }).success).toBe(
        false,
      );
    });
  });

  describe('updateServiceAgreementSchema', () => {
    it('Should accept valid updates containing data and optional title', () => {
      const payload = {
        title: 'New Policy Agreement',
        data: { optional: true },
      };
      const parsed = updateServiceAgreementSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });

    it('Should reject empty title strings or too long titles', () => {
      expect(updateServiceAgreementSchema.safeParse({ title: '', data: {} }).success).toBe(false);
      expect(
        updateServiceAgreementSchema.safeParse({ title: 'a'.repeat(256), data: {} }).success,
      ).toBe(false);
    });
  });

  describe('listServiceAgreementsSchema', () => {
    it('Should accept optional workspaceId filter', () => {
      expect(listServiceAgreementsSchema.parse({ workspaceId: VALID_UUID })).toEqual({
        workspaceId: VALID_UUID,
      });
      expect(listServiceAgreementsSchema.parse({})).toEqual({});
    });
  });

  describe('serviceAgreementSchema', () => {
    it('Should validate a correct service agreement payload', () => {
      const payload = {
        id: VALID_UUID,
        workspaceId: null,
        title: 'Global Terms of Service',
        kind: 'service-agreement',
        createdAt: '2026-07-28T12:00:00.000Z',
        updatedAt: '2026-07-28T12:00:00.000Z',
      };
      const parsed = serviceAgreementSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });

  describe('serviceAgreementVersionSchema', () => {
    it('Should validate correct version details', () => {
      const payload = {
        id: VALID_UUID,
        version: 1,
        status: 'draft' as const,
        data: { text: 'Draft Terms' },
        createdAt: '2026-07-28T12:00:00.000Z',
        publishedAt: null,
        archivedAt: null,
      };
      const parsed = serviceAgreementVersionSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });

  describe('serviceAgreementWithVersionSchema', () => {
    it('Should validate nested document and version properties', () => {
      const payload = {
        agreement: {
          id: VALID_UUID,
          workspaceId: null,
          title: 'Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          updatedAt: '2026-07-28T12:00:00.000Z',
        },
        version: {
          id: VALID_UUID,
          version: 1,
          status: 'draft' as const,
          data: {},
          createdAt: '2026-07-28T12:00:00.000Z',
          publishedAt: null,
          archivedAt: null,
        },
      };
      const parsed = serviceAgreementWithVersionSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });

  describe('agreementDefinitionSchema', () => {
    it('Should validate schemas and uischemas records', () => {
      const payload = {
        schema: { type: 'object' },
        uischema: { type: 'VerticalLayout' },
      };
      const parsed = agreementDefinitionSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });

  describe('associatedServiceSchema', () => {
    it('Should validate associated service details', () => {
      const payload = {
        id: 'srv-1',
        title: 'Waste Management Permit',
        workspaceSlug: 'waste-permit',
      };
      const parsed = associatedServiceSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });

  describe('serviceAgreementDetailSchema', () => {
    it('Should validate details containing versions, schemas, and services list', () => {
      const payload = {
        agreement: {
          id: VALID_UUID,
          workspaceId: null,
          title: 'Terms',
          kind: 'service-agreement',
          createdAt: '2026-07-28T12:00:00.000Z',
          updatedAt: '2026-07-28T12:00:00.000Z',
        },
        versions: [],
        definition: {
          schema: {},
          uischema: {},
        },
        services: [],
      };
      const parsed = serviceAgreementDetailSchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });

  describe('serviceAgreementSummarySchema', () => {
    it('Should validate summary containing status and isGlobal boolean flag', () => {
      const payload = {
        id: VALID_UUID,
        workspaceId: null,
        title: 'Global Terms',
        kind: 'service-agreement',
        createdAt: '2026-07-28T12:00:00.000Z',
        updatedAt: '2026-07-28T12:00:00.000Z',
        status: 'published' as const,
        isGlobal: true,
      };
      const parsed = serviceAgreementSummarySchema.parse(payload);
      expect(parsed).toEqual(payload);
    });
  });
});
